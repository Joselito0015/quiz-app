// main.js
const { app, BrowserWindow } = require("electron");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const isDev = process.env.NODE_ENV === "development";

let mainWindow;
let db;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1024,
		height: 768,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
		fullscreen: !isDev,
	});

	if (isDev) {
		mainWindow.loadURL("http://localhost:5173");
		mainWindow.webContents.openDevTools();
	} else {
		mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
	}

	// Inicializar base de datos
	db = new sqlite3.Database("./python/tracking.db", (err) => {
		if (err) {
			console.error("Error conectando a la base de datos:", err);
		} else {
			console.log("Conectado a la base de datos SQLite");
			startPolling();
		}
	});
}

function startPolling() {
	// Consultar la base de datos cada 100ms
	setInterval(() => {
		db.get(
			`
      SELECT left_count, right_count 
      FROM player_positions 
      ORDER BY timestamp DESC 
      LIMIT 1
    `,
			(err, row) => {
				if (err) {
					console.error(err);
					return;
				}
				if (row) {
					mainWindow.webContents.send("player-counts", {
						leftPlayers: row.left_count,
						rightPlayers: row.right_count,
					});
				}
			}
		);
	}, 100);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
	if (db) {
		db.close();
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});
