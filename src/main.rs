use std::time::Duration;

use actix_files::Files;
use actix_web::{
    App, HttpResponse, HttpServer, Responder, delete, get, post,
    web::{Data, Json},
};
use anyhow::{Context, Result};
use chrono::{NaiveDate, NaiveDateTime, NaiveTime, TimeDelta};
use itertools::Itertools;
use tokio::{fs, sync::Mutex};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TimeEntry {
    time: NaiveDateTime,
    estimated: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct Stats {
    pub longest_awake: Vec<(NaiveDate, String)>,
    pub shortest_awake: Vec<(NaiveDate, String)>,
    pub longest_asleep: Vec<(NaiveDate, String)>,
    pub shortest_asleep: Vec<(NaiveDate, String)>,
    pub earliest_wake: Vec<(NaiveDate, String)>,
    pub earliest_sleep: Vec<(NaiveDate, String)>,
    pub latest_wake: Vec<(NaiveDate, String)>,
    pub latest_sleep: Vec<(NaiveDate, String)>,
    pub avg_awake: String,
    pub avg_asleep: String,
}

pub const DATA_FILE: &str = "data.csv";
pub const SMALL_DELTA: TimeDelta = TimeDelta::minutes(5);
pub const BIG_DELTA: TimeDelta = TimeDelta::minutes(20);

pub struct AppState(pub Mutex<Vec<TimeEntry>>);

pub async fn save_to_disk(data: &[TimeEntry]) -> Result<()> {
    let mut writer = csv::Writer::from_path(DATA_FILE)?;
    for entry in data {
        writer.serialize(entry)?;
    }
    Ok(())
}

#[get("/api/entries")]
async fn get_entries(data: Data<AppState>) -> impl Responder {
    HttpResponse::Ok().json(
        data.0
            .lock()
            .await
            .iter()
            .flat_map(|entry| match entry.estimated {
                true => [entry.time - BIG_DELTA, entry.time + BIG_DELTA],
                false => [entry.time - SMALL_DELTA, entry.time + SMALL_DELTA],
            })
            .collect::<Vec<_>>(),
    )
}

#[post("/api/entry")]
async fn add_entry(data: Data<AppState>, Json(body): Json<TimeEntry>) -> impl Responder {
    let mut data_lock = data.0.lock().await;
    if data_lock
        .last()
        .is_some_and(|event| event.time >= body.time)
    {
        return HttpResponse::BadRequest().body("New event cannot be before last existing one");
    }
    data_lock.push(body);

    match save_to_disk(&data_lock).await {
        Ok(()) => HttpResponse::NoContent().finish(),
        Err(_) => HttpResponse::InternalServerError().body("Failed to save new data to disk"),
    }
}

#[delete("/api/entry")]
async fn delete_entry(data: Data<AppState>) -> impl Responder {
    let mut data_lock = data.0.lock().await;
    data_lock.pop();

    match save_to_disk(&data_lock).await {
        Ok(()) => HttpResponse::NoContent().finish(),
        Err(_) => HttpResponse::InternalServerError().body("Failed to save new data to disk"),
    }
}

#[get("/api/stats")]
async fn get_stats(data: Data<AppState>) -> impl Responder {
    let data_lock = data.0.lock().await;
    let spans = data_lock
        .windows(2)
        .map(|window| {
            (
                window[0].time.date(),
                window[1]
                    .time
                    .signed_duration_since(window[0].time)
                    .to_std()
                    .expect("end should be after start"),
            )
        })
        .collect::<Vec<_>>();

    HttpResponse::Ok().json(Stats {
        longest_awake: extremum_span(&spans, false, false),
        shortest_awake: extremum_span(&spans, false, true),
        longest_asleep: extremum_span(&spans, true, false),
        shortest_asleep: extremum_span(&spans, true, true),
        earliest_wake: extremum_time(&data_lock, false, true),
        earliest_sleep: extremum_time(&data_lock, true, true),
        latest_wake: extremum_time(&data_lock, false, false),
        latest_sleep: extremum_time(&data_lock, true, false),
        avg_awake: stats_avg(&spans, 0),
        avg_asleep: stats_avg(&spans, 1),
    })
}

struct RevIfIter<I> {
    iter: I,
    rev: bool,
}

impl<I: DoubleEndedIterator> Iterator for RevIfIter<I> {
    type Item = I::Item;

    fn next(&mut self) -> Option<Self::Item> {
        if self.rev {
            self.iter.next_back()
        } else {
            self.iter.next()
        }
    }
}

trait RevIf: DoubleEndedIterator + Sized {
    fn rev_if(self, should_reverse: bool) -> impl Iterator<Item = Self::Item> {
        RevIfIter {
            iter: self,
            rev: should_reverse,
        }
    }
}

impl<I: DoubleEndedIterator + Sized> RevIf for I {}

fn extremum_span(
    spans: &[(NaiveDate, Duration)],
    sleep: bool,
    min: bool,
) -> Vec<(NaiveDate, String)> {
    spans
        .iter()
        .skip(sleep as usize)
        .step_by(2)
        .sorted_unstable_by_key(|e| e.1)
        .rev_if(!min)
        .take(5)
        .map(|&(date, dur)| (date, humantime::format_duration(dur).to_string()))
        .collect_vec()
}

fn extremum_time(events: &[TimeEntry], sleep: bool, min: bool) -> Vec<(NaiveDate, String)> {
    events
        .iter()
        .skip(sleep as usize)
        .step_by(2)
        .map(|e| {
            (
                e.time,
                if sleep && e.time.time() < NaiveTime::from_hms_opt(6, 0, 0).unwrap() {
                    NaiveDate::MIN.and_time(e.time.time()) + TimeDelta::days(1)
                } else {
                    NaiveDate::MIN.and_time(e.time.time())
                },
            )
        })
        .sorted_unstable_by_key(|e| e.1)
        .rev_if(!min)
        .take(5)
        .map(|e| {
            (
                e.0.date(),
                e.0.format("%l:%M %P").to_string().trim().to_owned(),
            )
        })
        .collect_vec()
}

fn stats_avg(spans: &[(NaiveDate, Duration)], skip: usize) -> String {
    let avg = spans
        .iter()
        .skip(skip)
        .step_by(2)
        .map(|&(_, dur)| dur)
        .sum::<Duration>()
        / (spans.len() as u32 / 2);
    // round down to whole minutes
    let rounded_avg = Duration::from_secs(avg.as_secs() / 60 * 60);
    humantime::format_duration(rounded_avg).to_string()
}

#[actix_web::main]
async fn main() -> Result<()> {
    let saved_data = fs::read_to_string(DATA_FILE)
        .await
        .unwrap_or_else(|_| String::from("time,estimated"));
    let data = csv::Reader::from_reader(saved_data.as_bytes())
        .into_deserialize::<TimeEntry>()
        .collect::<Result<Vec<_>, _>>()
        .context("deserializing initial data")?;
    let state = Data::new(AppState(Mutex::new(data)));

    HttpServer::new(move || {
        App::new()
            .service(get_entries)
            .service(add_entry)
            .service(delete_entry)
            .service(get_stats)
            .service(Files::new("/", "./frontend/dist/sleepy/browser").index_file("index.html"))
            .app_data(state.clone())
    })
    .bind(("0.0.0.0", 17425))?
    .run()
    .await?;

    Ok(())
}
