const CACHE_NAME = 'uniflow-cache-v1';
const TURSO_URL = 'https://uniflow-razn.aws-ap-northeast-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5MTQxNTYsImlkIjoiMDE5ZjFkYjQtMDMwMS03MzIzLTgwMTctZTU2ZThlYWQ4Y2RjIiwia2lkIjoiWS16TWJXcUJtTU9XVGRDWDFSaVo5MG82aGFmQVlIWV9Vb21ndjJHTjFRZyIsInJpZCI6IjU3MDdjMDY5LWRlM2UtNDhiZS1hNGI1LTY0MWU0OTMzMjU3OSJ9.tTcJ9qz6v2iFgy6Z4f-pfldcXyfbg09HIo9Dbv7TWjHjyMyMY7c4ZPfAW2dYlkIHPZ5p8BBzkVu7D20VnMnGBg';

const ASSETS = [
    './',
    './index.html',
    './logo.png',
    './css/main.css',
    './css/components.css',
    './css/auth.css',
    './css/dashboard.css',
    './css/finance.css',
    './css/schedule.css',
    './css/assignment.css',
    './css/settings.css',
    './js/app.js',
    './js/services/api.js',
    './js/components/forms.js',
    './js/components/modal.js',
    './js/components/ripple.js',
    './js/pages/assignment.js',
    './js/pages/dashboard.js',
    './js/pages/finance.js',
    './js/pages/attendance.js',
    './js/pages/planner.js',
    './js/pages/prayer.js',
    './js/pages/qibla.js',
    './js/pages/schedule.js',
    './js/pages/settings.js',
    './js/pages/vault.js'
];

// Helper to format local date string YYYY-MM-DD HH:MM:SS in the client timezone
function getLocalTimeStr() {
    const now = new Date();
    const localNow = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    return localNow.toISOString().replace('T', ' ').slice(0, 19);
}

// execute statement on Turso Database Cloud from Service Worker
async function executeOnTurso(sql, args = []) {
    const hranaArgs = args.map(arg => {
        if (arg === null || arg === undefined) return { type: "null" };
        if (typeof arg === "number") {
            return Number.isInteger(arg) 
                ? { type: "integer", value: arg.toString() } 
                : { type: "float", value: arg };
        }
        if (typeof arg === "boolean") return { type: "integer", value: arg ? "1" : "0" };
        return { type: "text", value: arg.toString() };
    });

    const payload = {
        requests: [
            {
                type: "execute",
                stmt: { sql, args: hranaArgs }
            },
            { type: "close" }
        ]
    };

    const response = await fetch(`${TURSO_URL}/v2/pipeline`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TURSO_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Turso HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
        throw new Error("Empty Turso response pipeline.");
    }

    const executeResult = data.results[0];
    if (executeResult.type === "error") {
        throw new Error(executeResult.error.message);
    }

    return executeResult.response.result;
}

// Background task to check and trigger scheduled notifications
async function checkAndShowNotifications() {
    const localTimeStr = getLocalTimeStr();
    const sqlSelect = "SELECT id, title, body FROM notifications WHERE sent = 0 AND datetime(scheduled_time) <= datetime(?)";

    try {
        const selectResult = await executeOnTurso(sqlSelect, [localTimeStr]);
        if (selectResult && selectResult.rows && selectResult.rows.length > 0) {
            const cols = selectResult.cols.map(c => c.name);
            const rows = selectResult.rows.map(row => {
                const obj = {};
                row.forEach((cell, idx) => {
                    obj[cols[idx]] = cell.value;
                });
                return obj;
            });

            for (const notif of rows) {
                // Show notification to user
                await self.registration.showNotification(notif.title || 'UniFlow Notification', {
                    body: notif.body || '',
                    icon: './logo.png',
                    badge: './logo.png',
                    vibrate: [100, 50, 100],
                    data: { id: notif.id }
                });

                // Update notification state to sent = 1 in Turso
                const sqlUpdate = "UPDATE notifications SET sent = 1 WHERE id = ?";
                await executeOnTurso(sqlUpdate, [parseInt(notif.id)]);
            }
        }

        // Auto-cleanup: delete notifications with sent = 1 that are older than 14 days (2 weeks)
        const sqlCleanup = "DELETE FROM notifications WHERE sent = 1 AND datetime(scheduled_time) < datetime(?, '-14 days')";
        await executeOnTurso(sqlCleanup, [localTimeStr]);
    } catch (err) {
        console.error("Service worker background check error:", err);
    }
}

// Message Event: Listen for SKIP_WAITING signal from client update banner
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Install Event: Cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Caching offline assets...');
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Event: Claim clients and clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event: Serve cached assets offline or fetch via network
self.addEventListener('fetch', (event) => {
    // If navigating inside the app, check notifications in the background
    if (event.request.mode === 'navigate') {
        event.waitUntil(checkAndShowNotifications());
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request).catch((err) => {
                // Dynamic assets or fallbacks
                console.log("Offline fetch fallback error: ", err);
            });
        })
    );
});

// Periodic Sync: Triggered periodically by the browser
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-notifications') {
        event.waitUntil(checkAndShowNotifications());
    }
});

// Background Sync: Triggered when connection is restored
self.addEventListener('sync', (event) => {
    if (event.tag === 'check-notifications') {
        event.waitUntil(checkAndShowNotifications());
    }
});

// Push API Event: Handle server push notifications (Vercel Cron -> Web Push)
self.addEventListener('push', (event) => {
    let data = { title: 'UniFlow Alert', body: 'New update from UniFlow!' };
    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        if (event.data) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body || '',
        icon: './logo.png',
        badge: './logo.png',
        vibrate: [100, 50, 100],
        data: data.data || { url: './' }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'UniFlow Notification', options)
    );
});

// Notification click behavior: Open application or bring to focus
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('./');
            }
        })
    );
});
