const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');

const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
    if (err) process.exit(1);
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('ID: ', (orderId) => {
    const id = orderId.trim();
    if (!id || isNaN(id)) {
        rl.close(); db.close(); return;
    }

    rl.question('Takip No: ', (realCargoCode) => {
        const cargoCode = realCargoCode.trim();
        if (!cargoCode) {
            rl.close(); db.close(); return;
        }

        const updateSql = `UPDATE guest_orders SET cargo_state = 1, cargo_tracking_code = ? WHERE id = ?`;
        db.run(updateSql, [cargoCode, id], function (err) {
            if (!err && this.changes > 0) {
                console.log(`Başarılı!`);
            }
            rl.close();
            db.close();
        });
    });
});