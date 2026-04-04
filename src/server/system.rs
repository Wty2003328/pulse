use axum::{extract::State, response::Json, routing::get, Router};
use sysinfo::{Disks, System};

use super::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route("/stats", get(system_stats))
}

async fn system_stats(State(state): State<AppState>) -> Json<serde_json::Value> {
    let mut sys = state.sysinfo.lock().unwrap();
    sys.refresh_cpu_usage();
    sys.refresh_memory();

    let cpu = sys.global_cpu_usage();
    let mem_used = sys.used_memory();
    let mem_total = sys.total_memory();
    let mem_pct = if mem_total > 0 {
        (mem_used as f64 / mem_total as f64) * 100.0
    } else {
        0.0
    };

    let hostname = System::host_name().unwrap_or_else(|| "unknown".to_string());
    let uptime = System::uptime();

    drop(sys); // release lock before disk I/O

    let disks = Disks::new_with_refreshed_list();
    let (disk_used, disk_total) = disks.iter().fold((0u64, 0u64), |(u, t), d| {
        (
            u + (d.total_space() - d.available_space()),
            t + d.total_space(),
        )
    });
    let disk_pct = if disk_total > 0 {
        (disk_used as f64 / disk_total as f64) * 100.0
    } else {
        0.0
    };

    Json(serde_json::json!({
        "hostname": hostname,
        "uptime_secs": uptime,
        "cpu_percent": (cpu as f64 * 10.0).round() / 10.0,
        "memory_used_bytes": mem_used,
        "memory_total_bytes": mem_total,
        "memory_percent": (mem_pct * 10.0).round() / 10.0,
        "disk_used_bytes": disk_used,
        "disk_total_bytes": disk_total,
        "disk_percent": (disk_pct * 10.0).round() / 10.0,
    }))
}
