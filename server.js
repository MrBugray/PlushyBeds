const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const Iyzipay = require('iyzipay');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

const ENCRYPTION_KEY = crypto.scryptSync(process.env.SECRET_CRYPT_KEY || 'default-fallback-key', 'salt', 32);
const ALGORITHM = 'aes-256-cbc';

const iyzico = new Iyzipay({
    apiKey: process.env.IYZICO_API_KEY,
    secretKey: process.env.IYZICO_SECRET_KEY,
    uri: 'https://sandbox-api.iyzipay.com'
});

function encryptData(text) {
    if (!text) return '';
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const encryptedResult = iv.toString('hex') + ':' + encrypted;
        return encryptedResult;
    } catch (error) {
        return '';
    }
}

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
        return '';
    }
}

function validateCardNumber(number) {
    let sum = 0;
    let shouldDouble = false;
    for (let i = number.length - 1; i >= 0; i--) {
        let digit = parseInt(number.charAt(i));
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return (sum % 10) === 0;
}

const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
    if (err) {
        console.error('Hata:', err.message);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            phone TEXT,
            address TEXT,
            city TEXT,
            district TEXT,
            zip_code TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS guest_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            secure_email TEXT NOT NULL,
            secure_phone TEXT NOT NULL,
            secure_address TEXT NOT NULL,
            city TEXT NOT NULL,
            district TEXT NOT NULL,
            zip_code TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            payment_status TEXT NOT NULL,
            iyzico_payment_id TEXT,
            cargo_tracking_code TEXT,
            cargo_state INTEGER DEFAULT 0,
            user_email TEXT,
            order_date DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (!err) {
                db.run(`ALTER TABLE guest_orders ADD COLUMN cargo_tracking_code TEXT`, () => { });
                db.run(`ALTER TABLE guest_orders ADD COLUMN cargo_state INTEGER DEFAULT 0`, () => { });
                db.run(`ALTER TABLE guest_orders ADD COLUMN user_email TEXT`, () => { });
            }
        });
    }
});

app.post('/api/signup', (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ success: false, message: 'Tum alanlari doldurmaniz zorunludur.' });

    const sql = `INSERT INTO users (email, password, first_name) VALUES (?, ?, ?)`;
    db.run(sql, [email, password, name], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) return res.status(400).json({ success: false, message: 'Bu e-posta adresi zaten kayitli.' });
            return res.status(500).json({ success: false, message: 'Hata.' });
        }
        res.json({ success: true, message: 'Kayit basarili.', name: name });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Zorunlu alanlar.' });

    const sql = `SELECT * FROM users WHERE email = ? AND password = ?`;
    db.get(sql, [email, password], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: 'Hata.' });
        if (row) res.json({ success: true, message: 'Giris basarili.', name: row.first_name || 'Kullanici' });
        else res.status(401).json({ success: false, message: 'Hatali e-posta veya sifre.' });
    });
});

app.post('/api/get-profile', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false });

    const sql = `SELECT * FROM users WHERE email = ?`;
    db.get(sql, [email], (err, row) => {
        if (err || !row) return res.json({ success: false });

        res.json({
            success: true,
            data: {
                first_name: row.first_name || '',
                last_name: row.last_name || '',
                phone: decryptData(row.phone),
                address: decryptData(row.address),
                city: row.city || '',
                district: row.district || '',
                zip_code: row.zip_code || ''
            }
        });
    });
});

app.post('/api/guest-order', (req, res) => {
    const { firstName, lastName, email, phone, address, city, district, zipCode, quantity, cardHolderName, cardNumber, expireDate, cvc, saveProfile, saveCard, isUserOrder } = req.body;

    if (!firstName || !lastName || !email || !phone || !address || !city || !district || !zipCode || !quantity || quantity < 1) {
        return res.status(400).json({ success: false, message: "Eksik bilgi." });
    }

    if (!cardHolderName || !cardNumber || !expireDate || !cvc) {
        return res.status(400).json({ success: false, message: "Eksik kart." });
    }

    if (!validateCardNumber(cardNumber) || cardNumber.length < 15 || cardNumber.length > 16) {
        return res.status(400).json({ success: false, message: "Gecersiz kart." });
    }

    if (cvc.length < 3 || cvc.length > 4) {
        return res.status(400).json({ success: false, message: "Gecersiz CVC." });
    }

    const [expireMonth, expireYear] = expireDate.split('/');
    const fullYear = "20" + expireYear;
    const totalPrice = (quantity * 500).toString();
    const iyzicoRequest = {
        locale: Iyzipay.LOCALE.TR,
        conversationId: Math.floor(Math.random() * 1000000000).toString(),
        price: totalPrice,
        paidPrice: totalPrice,
        currency: Iyzipay.CURRENCY.TRY,
        installments: '1',
        basketId: 'B' + Math.floor(Math.random() * 100000),
        paymentChannel: Iyzipay.PAYMENT_CHANNEL.WEB,
        paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
        paymentCard: {
            cardHolderName: cardHolderName,
            cardNumber: cardNumber,
            expireMonth: expireMonth,
            expireYear: fullYear,
            cvc: cvc,
            registerCard: saveCard ? '1' : '0'
        },
        buyer: {
            id: 'BY' + Math.floor(Math.random() * 100000),
            name: firstName,
            surname: lastName,
            gsmNumber: phone.startsWith('0') ? phone : '+90' + phone,
            email: email,
            identityNumber: '11111111111',
            lastLoginDate: '2026-06-16 12:00:00',
            registrationDate: '2026-06-16 12:00:00',
            registrationAddress: address,
            ip: req.ip || '127.0.0.1',
            city: city,
            country: 'Turkey',
            zipCode: zipCode
        },
        shippingAddress: {
            contactName: firstName + ' ' + lastName,
            city: city,
            country: 'Turkey',
            address: address,
            zipCode: zipCode
        },
        billingAddress: {
            contactName: firstName + ' ' + lastName,
            city: city,
            country: 'Turkey',
            address: address,
            zipCode: zipCode
        },
        basketItems: [
            {
                id: 'BI01',
                name: 'Plushy Kopek Yatagi',
                category1: 'Evcil Hayvan',
                category2: 'Yatak',
                itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
                price: totalPrice
            }
        ]
    };

    iyzico.payment.create(iyzicoRequest, function (err, result) {
        if (err || result.status !== 'success') {
            return res.status(400).json({ success: false, message: "Reddedildi." });
        }

        try {
            const secureEmail = encryptData(email);
            const securePhone = encryptData(phone);
            const secureAddress = encryptData(address);
            const paymentStatus = "SUCCESSFUL_IYZICO_PAYMENT";
            const iyzicoPaymentId = result.paymentId;
            const initialCargoTrackingCode = null;
            const initialCargoState = 0;
            const userEmailToSave = isUserOrder ? email : null;

            if (isUserOrder && saveProfile) {
                const updateSql = `UPDATE users SET first_name = ?, last_name = ?, phone = ?, address = ?, city = ?, district = ?, zip_code = ? WHERE email = ?`;
                db.run(updateSql, [firstName, lastName, securePhone, secureAddress, city, district, zipCode, email]);
            }

            const sql = `INSERT INTO guest_orders (first_name, last_name, secure_email, secure_phone, secure_address, city, district, zip_code, quantity, payment_status, iyzico_payment_id, cargo_tracking_code, cargo_state, user_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const params = [firstName, lastName, secureEmail, securePhone, secureAddress, city, district, zipCode, quantity, paymentStatus, iyzicoPaymentId, initialCargoTrackingCode, initialCargoState, userEmailToSave];

            db.run(sql, params, function (err) {
                if (err) return res.status(500).json({ success: false, message: "Hata." });
                return res.json({ success: true, orderId: this.lastID });
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: "Hata." });
        }
    });
});

app.post('/api/update-profile', (req, res) => {
    const { email, firstName, lastName, phone, address, city, district, zipCode } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Hata.' });

    try {
        const securePhone = encryptData(phone);
        const secureAddress = encryptData(address);
        const sql = `UPDATE users SET first_name = ?, last_name = ?, phone = ?, address = ?, city = ?, district = ?, zip_code = ? WHERE email = ?`;
        const params = [firstName, lastName, securePhone, secureAddress, city, district, zipCode, email];

        db.run(sql, params, function (err) {
            if (err) return res.status(500).json({ success: false, message: 'Hata.' });
            res.json({ success: true, message: 'Guncellendi.', name: firstName });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Hata.' });
    }
});

app.post('/api/get-orders', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false });

    const sql = `SELECT * FROM guest_orders WHERE user_email = ? ORDER BY id DESC`;
    db.all(sql, [email], (err, rows) => {
        if (err) return res.json({ success: false });

        const orders = rows.map(row => ({
            id: row.id,
            date: row.order_date,
            status: row.cargo_state,
            trackingCode: row.cargo_tracking_code
        }));
        res.json({ success: true, orders });
    });
});

app.listen(PORT, () => {
    console.log(`Aktif: ${PORT}`);
});