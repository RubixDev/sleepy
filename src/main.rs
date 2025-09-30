use actix_files::Files;
use actix_web::{App, HttpResponse, HttpServer, Responder, get, web::Data};
use anyhow::{Context, Result};
use chrono::{NaiveDateTime, TimeDelta};
use tokio::{fs, sync::Mutex};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TimeEntry {
    time: NaiveDateTime,
    estimated: bool,
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
            .service(Files::new("/", "./frontend/dist/sleepy/browser").index_file("index.html"))
            .app_data(state.clone())
    })
    .bind(("0.0.0.0", 17425))?
    .run()
    .await?;

    Ok(())
}
