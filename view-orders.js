const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const ExcelJS = require('exceljs');

const ENCRYPTION_KEY = crypto.scryptSync(process.env.SECRET_CRYPT_KEY || 'default-fallback-key', 'salt', 32);
const ALGORITHM = 'aes-256-cbc';

function decryptData(text) {
    if (!text || !text.includes(':')) return text;
    try {
        const textParts = text.split(':');
        const ivHex = textParts.shift();
        const encryptedHex = textParts.join(':');
        const iv = Buffer.from(ivHex, 'hex');
        const encryptedText = Buffer.from(encryptedHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        return 'HATA';
    }
}

const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
    if (err) process.exit(1);
});

db.all(`SELECT * FROM guest_orders ORDER BY id DESC`, [], async (err, rows) => {
    if (err || rows.length === 0) {
        db.close();
        return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Siparisler');

    worksheet.columns = [
        { header: 'Siparis No', key: 'id', width: 12 },
        { header: 'Tarih', key: 'date', width: 22 },
        { header: 'Isim', key: 'firstName', width: 15 },
        { header: 'Soyisim', key: 'lastName', width: 15 },
        { header: 'E-posta', key: 'email', width: 30 },
        { header: 'Telefon', key: 'phone', width: 18 },
        { header: 'Acik Adres', key: 'address', width: 60 },
        { header: 'Sehir', key: 'city', width: 15 },
        { header: 'Ilce', key: 'district', width: 15 },
        { header: 'Posta Kodu', key: 'zip', width: 12 },
        { header: 'Adet', key: 'quantity', width: 8 },
        { header: 'Odeme Durumu', key: 'status', width: 25 },
        { header: 'Kargo Takip Kodu', key: 'cargoCode', width: 20 },
        { header: 'Kargo Durumu', key: 'cargoState', width: 20 },
        { header: 'iyzico Islem ID', key: 'iyzico', width: 25 }
    ];

    worksheet.getRow(1).font = { bold: true };

    rows.forEach(row => {
        worksheet.addRow({
            id: row.id,
            date: new Date(row.order_date).toLocaleString('tr-TR'),
            firstName: row.first_name,
            lastName: row.last_name,
            email: decryptData(row.secure_email),
            phone: decryptData(row.secure_phone),
            address: decryptData(row.secure_address),
            city: row.city,
            district: row.district,
            zip: row.zip_code,
            quantity: row.quantity,
            status: row.payment_status,
            cargoCode: row.cargo_tracking_code || 'Atanmadi',
            cargoState: row.cargo_state === 1 ? 'Kargoya Verildi' : 'Kargoya Verilmedi',
            iyzico: row.iyzico_payment_id
        });
    });

    const fileName = 'PlushyBeds_Siparisler.xlsx';
    await workbook.xlsx.writeFile(path.join(__dirname, fileName));
    db.close();
});