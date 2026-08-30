const webpush = require('web-push');

const TURSO_URL = process.env.TURSO_URL || "https://uniflow-razn.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = process.env.TURSO_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5MTQxNTYsImlkIjoiMDE5ZjFkYjQtMDMwMS03MzIzLTgwMTctZTU2ZThlYWQ4Y2RjIiwia2lkIjoiWS16TWJXcUJtTU9XVGRDWDFSaVo5MG82aGFmQVlIWV9Vb21ndjJHTjFRZyIsInJpZCI6IjU3MDdjMDY5LWRlM2UtNDhiZS1hNGI1LTY0MWU0OTMzMjU3OSJ9.tTcJ9qz6v2iFgy6Z4f-pfldcXyfbg09HIo9Dbv7TWjHjyMyMY7c4ZPfAW2dYlkIHPZ5p8BBzkVu7D20VnMnGBg";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BKo1ZzuNImLi5DaIJzwzjB9t1uE3SUaAhVLGWMWbtub8p4Eq_eZATXK9Fs-DruPoNNvuUZZHN0vJF3THehYKn7E";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "A52wD5bviAAB1M_Z1_4P2Eih8ML1jeCpp_wYDTbwwTY";
const VAPID_SUBJECT = "mailto:admin@lifeflow.app";

webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

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
            { type: "execute", stmt: { sql, args: hranaArgs } },
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
        throw new Error(`Turso HTTP Error ${response.status}`);
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) return null;
    const res = data.results[0];
    if (res.type === "error") throw new Error(res.error.message);

    const result = res.response.result;
    if (!result || !result.cols || !result.rows) return [];
    
    const colNames = result.cols.map(c => c.name);
    return result.rows.map(row => {
        const obj = {};
        row.forEach((cell, idx) => {
            let val = cell.value;
            if (cell.type === 'integer') val = parseInt(val, 10);
            else if (cell.type === 'float') val = parseFloat(val);
            else if (cell.type === 'null') val = null;
            obj[colNames[idx]] = val;
        });
        return obj;
    });
}

module.exports = async function handler(req, res) {
    try {
        // 1. Ensure push_subscriptions table exists
        await executeOnTurso(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                endpoint TEXT UNIQUE NOT NULL,
                p256dh TEXT NOT NULL,
                auth TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Calculate current time in Malaysia Timezone (UTC + 8 hours)
        const nowUTC = new Date();
        const nowMY = new Date(nowUTC.getTime() + (8 * 60 * 60 * 1000));
        const localTimeStr = nowMY.toISOString().replace('T', ' ').slice(0, 19);

        const cleanupDate = new Date(nowMY.getTime() - (14 * 24 * 60 * 60 * 1000));
        const cleanupTimeStr = cleanupDate.toISOString().replace('T', ' ').slice(0, 19);

        // Fetch pending notifications due now (matching Malaysia scheduled_time)
        const pendingNotifs = await executeOnTurso(
            "SELECT id, title, body, type, scheduled_time FROM notifications WHERE sent = 0 AND datetime(scheduled_time) <= datetime(?)",
            [localTimeStr]
        );

        if (!pendingNotifs || pendingNotifs.length === 0) {
            // Auto-cleanup sent notifications older than 14 days
            await executeOnTurso("DELETE FROM notifications WHERE sent = 1 AND datetime(scheduled_time) < datetime(?)", [cleanupTimeStr]);
            return res.status(200).json({ success: true, message: "No pending notifications.", timeChecked: localTimeStr, processed: 0 });
        }

        // 3. Fetch active push subscriptions
        const subscribers = await executeOnTurso("SELECT id, endpoint, p256dh, auth FROM push_subscriptions");

        let pushCount = 0;

        for (const notif of pendingNotifs) {
            const payload = JSON.stringify({
                title: notif.title || 'Lifeflow Notification',
                body: notif.body || '',
                icon: './logo.png',
                badge: './logo.png',
                data: { id: notif.id, url: './' }
            });

            if (subscribers && subscribers.length > 0) {
                for (const sub of subscribers) {
                    const pushSubscription = {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth
                        }
                    };

                    try {
                        await webpush.sendNotification(pushSubscription, payload);
                        pushCount++;
                    } catch (err) {
                        if (err.statusCode === 404 || err.statusCode === 410) {
                            console.log(`Removing expired subscription ID: ${sub.id}`);
                            await executeOnTurso("DELETE FROM push_subscriptions WHERE id = ?", [sub.id]);
                        } else {
                            console.warn(`Web push error for sub ${sub.id}:`, err.message);
                        }
                    }
                }
            }

            // 4. Mark notification as sent in Turso
            await executeOnTurso("UPDATE notifications SET sent = 1 WHERE id = ?", [notif.id]);
        }

        // 5. Clean up old 2-week-old notifications
        await executeOnTurso("DELETE FROM notifications WHERE sent = 1 AND datetime(scheduled_time) < datetime(?)", [cleanupTimeStr]);

        return res.status(200).json({
            success: true,
            message: `Processed ${pendingNotifs.length} notification(s). Sent ${pushCount} push messages.`,
            timeChecked: localTimeStr,
            processed: pendingNotifs.length,
            pushesSent: pushCount
        });

    } catch (error) {
        console.error("Cron Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

