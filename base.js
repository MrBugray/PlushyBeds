let isLoggedIn = false;
let loggedInUserEmail = "";
let loggedInUserName = "";
let currentMode = "login";
let openedFromOrderFlow = false;

const loginBtn = document.querySelector('.btn-login');
const signupBtn = document.querySelector('.btn-signup');
const darkModeToggle = document.getElementById('darkModeToggle');
const authModal = document.getElementById('authModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalTitle = document.getElementById('modalTitle');
const nameGroup = document.getElementById('nameGroup');
const nameInput = document.getElementById('nameInput');
const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
const rememberMeGroup = document.getElementById('rememberMeGroup');
const authForm = document.getElementById('authForm');
const errorBox = document.getElementById('errorBox');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const confirmPasswordInput = document.getElementById('confirmPasswordInput');
const rememberMeCheckbox = document.getElementById('rememberMeCheckbox');
const orderModal = document.getElementById('orderModal');
const openOrderModalBtn = document.getElementById('openOrderModalBtn');
const closeOrderModalBtn = document.getElementById('closeOrderModalBtn');
const orderStep1 = document.getElementById('orderStep1');
const orderStep2 = document.getElementById('orderStep2');
const orderSelectSignup = document.getElementById('orderSelectSignup');
const orderSelectGuest = document.getElementById('orderSelectGuest');
const orderSelectLogin = document.getElementById('orderSelectLogin');
const guestOrderForm = document.getElementById('guestOrderForm');
const orderErrorBox = document.getElementById('orderErrorBox');
const deliverySection = document.getElementById('deliverySection');
const paymentSection = document.getElementById('paymentSection');
const goToPaymentBtn = document.getElementById('goToPaymentBtn');
const backToDeliveryBtn = document.getElementById('backToDeliveryBtn');
const saveProfileGroup = document.getElementById('saveProfileGroup');
const saveCardGroup = document.getElementById('saveCardGroup');
const track = document.querySelector('.carousel-track');
const slides = track ? Array.from(track.children) : [];
const nextButton = document.querySelector('.carousel-button-right');
const prevButton = document.querySelector('.carousel-button-left');
const dotsNav = document.querySelector('.carousel-nav');
const dots = dotsNav ? Array.from(dotsNav.children) : [];
const profileModal = document.getElementById('profileModal');
const ordersModal = document.getElementById('ordersModal');
const closeProfileModalBtn = document.getElementById('closeProfileModalBtn');
const closeOrdersModalBtn = document.getElementById('closeOrdersModalBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
if (darkModeToggle) {
    darkModeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    darkModeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        darkModeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
}

function updateSlide(currentSlide, targetSlide, currentDot, targetDot) {
    if (!currentSlide || !targetSlide || !currentDot || !targetDot) return;
    currentSlide.classList.remove('active-slide');
    targetSlide.classList.add('active-slide');
    currentDot.classList.remove('active-dot');
    targetDot.classList.add('active-dot');
}

function getNextSlide() {
    if (!track || !dotsNav) return;
    const currentSlide = track.querySelector('.active-slide');
    const currentDot = dotsNav.querySelector('.active-dot');
    if (!currentSlide || !currentDot) return;
    let nextSlide = currentSlide.nextElementSibling;
    let nextDot = currentDot.nextElementSibling;
    if (!nextSlide) {
        nextSlide = slides[0];
        nextDot = dots[0];
    }
    updateSlide(currentSlide, nextSlide, currentDot, nextDot);
}

if (nextButton && prevButton && dotsNav) {
    nextButton.addEventListener('click', getNextSlide);
    prevButton.addEventListener('click', () => {
        const currentSlide = track.querySelector('.active-slide');
        const currentDot = dotsNav.querySelector('.active-dot');
        let prevSlide = currentSlide.previousElementSibling;
        let prevDot = currentDot.previousElementSibling;
        if (!prevSlide) {
            prevSlide = slides[slides.length - 1];
            prevDot = dots[dots.length - 1];
        }
        updateSlide(currentSlide, prevSlide, currentDot, prevDot);
    });
    dotsNav.addEventListener('click', e => {
        const targetDot = e.target.closest('button');
        if (!targetDot) return;
        const currentSlide = track.querySelector('.active-slide');
        const currentDot = dotsNav.querySelector('.active-dot');
        const targetIndex = dots.findIndex(dot => dot === targetDot);
        const targetSlide = slides[targetIndex];
        updateSlide(currentSlide, targetSlide, currentDot, targetDot);
    });
}

let autoPlay = setInterval(getNextSlide, 5000);
const carouselSection = document.querySelector('.hero-carousel');
if (carouselSection) {
    carouselSection.addEventListener('mouseenter', () => clearInterval(autoPlay));
    carouselSection.addEventListener('mouseleave', () => {
        clearInterval(autoPlay);
        autoPlay = setInterval(getNextSlide, 5000);
    });
}

function updateAuthUI(name) {
    const authButtonsDiv = document.querySelector('.auth-buttons');
    if (authButtonsDiv) {
        authButtonsDiv.innerHTML = `
            <div class="user-menu-container">
                <button id="userProfileBtn" class="user-profile-btn">
                    👋 <span style="margin: 0 6px;">${name}</span> <span style="font-size: 10px;">▼</span>
                </button>
                <div id="userDropdown" class="user-dropdown-menu">
                    <button id="openProfileBtn" class="dropdown-item">📍 Adres Bilgilerim</button>
                    <button id="openOrdersBtn" class="dropdown-item">📦 Siparişlerim</button>
                    <button id="logoutBtn" class="dropdown-item">🚪 Çıkış Yap</button>
                </div>
            </div>
        `;

        const userProfileBtn = document.getElementById('userProfileBtn');
        const userDropdown = document.getElementById('userDropdown');

        userProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            if (userDropdown.classList.contains('active')) {
                userDropdown.classList.remove('active');
            }
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('rememberedEmail');
            localStorage.removeItem('rememberedHash');
            localStorage.removeItem('rememberedName');
            window.location.reload();
        });

        document.getElementById('openProfileBtn').addEventListener('click', async () => {
            document.getElementById('profileModal').classList.add('active');
            userDropdown.classList.remove('active');

            try {
                const response = await fetch('/api/get-profile', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true'
                    },
                    body: JSON.stringify({ email: loggedInUserEmail })
                });
                const result = await response.json();
                if (result.success && result.data) {
                    const d = result.data;
                    document.getElementById('profileFirstName').value = d.first_name || loggedInUserName || '';
                    document.getElementById('profileLastName').value = d.last_name || '';
                    document.getElementById('profilePhone').value = d.phone || '';
                    document.getElementById('profileAddress').value = d.address || '';
                    document.getElementById('profileCity').value = d.city || '';
                    document.getElementById('profileDistrict').value = d.district || '';
                    document.getElementById('profileZip').value = d.zip_code || '';

                    if (document.getElementById('profilePhone').value) {
                        document.getElementById('profilePhone').dispatchEvent(new Event('input'));
                    }
                }
            } catch (error) {
                console.error(error);
            }
        });

        document.getElementById('openOrdersBtn').addEventListener('click', async () => {
            document.getElementById('ordersModal').classList.add('active');
            userDropdown.classList.remove('active');
            const list = document.getElementById('ordersList');
            list.innerHTML = "Yukleniyor...";
            try {
                const response = await fetch('/api/get-orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true'
                    },
                    body: JSON.stringify({ email: loggedInUserEmail })
                });
                const result = await response.json();
                if (result.success && result.orders.length > 0) {
                    list.innerHTML = result.orders.map(o => `
                        <div style="border:1px solid var(--border-color); padding:15px; border-radius:8px; background:var(--bg-primary);">
                            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                                <strong>Siparis No: #${o.id}</strong>
                                <span style="font-size:12px; color:var(--text-secondary);">${new Date(o.date).toLocaleDateString('tr-TR')}</span>
                            </div>
                            <div style="font-size:14px;">
                                ${o.status === 1
                            ? `🚚 Kargoya Verildi <br> 🔗 Takip No: <strong style="color:#ec008c;">${o.trackingCode}</strong>`
                            : `📦 Hazirlaniyor`
                        }
                            </div>
                        </div>
                    `).join('');
                } else {
                    list.innerHTML = "Henuz siparisiniz bulunmamaktadir.";
                }
            } catch (error) {
                list.innerHTML = "Siparisler cekilemedi.";
            }
        });
    }
}

async function fillSavedProfile(email) {
    try {
        const response = await fetch('/api/get-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ email })
        });
        const result = await response.json();
        if (result.success && result.data) {
            const d = result.data;
            const firstNameInput = document.getElementById('guestFirstName');
            const lastNameInput = document.getElementById('guestLastName');
            const phoneInput = document.getElementById('guestPhone');
            const addressInput = document.getElementById('guestAddress');
            const cityInput = document.getElementById('guestCity');
            const districtInput = document.getElementById('guestDistrict');
            const zipCodeInput = document.getElementById('guestZipCode');
            if (firstNameInput && d.first_name) firstNameInput.value = d.first_name;
            if (lastNameInput && d.last_name) lastNameInput.value = d.last_name;
            if (phoneInput && d.phone) phoneInput.value = d.phone;
            if (addressInput && d.address) addressInput.value = d.address;
            if (cityInput && d.city) cityInput.value = d.city;
            if (districtInput && d.district) districtInput.value = d.district;
            if (zipCodeInput && d.zip_code) zipCodeInput.value = d.zip_code;
        }
    } catch (error) {
        console.error(error);
    }
}

if (openOrderModalBtn) {
    openOrderModalBtn.addEventListener('click', () => {
        if (!orderStep1 || !orderStep2 || !orderErrorBox || !guestOrderForm || !deliverySection || !paymentSection) return;
        orderErrorBox.style.display = "none";
        guestOrderForm.reset();
        paymentSection.style.display = "none";
        deliverySection.style.display = "block";
        if (isLoggedIn) {
            orderStep1.style.display = "none";
            orderStep2.style.display = "block";
            const guestEmailInput = document.getElementById('guestEmail');
            if (guestEmailInput) guestEmailInput.value = loggedInUserEmail;
            const guestFirstName = document.getElementById('guestFirstName');
            if (guestFirstName && !guestFirstName.value && loggedInUserName) {
                guestFirstName.value = loggedInUserName;
            }
            if (saveProfileGroup) saveProfileGroup.style.display = "flex";
            if (saveCardGroup) saveCardGroup.style.display = "flex";
            fillSavedProfile(loggedInUserEmail);
        } else {
            orderStep1.style.display = "block";
            orderStep2.style.display = "none";
            if (saveProfileGroup) saveProfileGroup.style.display = "none";
            if (saveCardGroup) saveCardGroup.style.display = "none";
        }
        orderModal.classList.add('active');
    });
}

if (closeOrderModalBtn && orderModal) {
    closeOrderModalBtn.addEventListener('click', () => orderModal.classList.remove('active'));
}

if (orderSelectGuest) {
    orderSelectGuest.addEventListener('click', () => {
        if (orderStep1 && orderStep2) {
            orderStep1.style.display = "none";
            orderStep2.style.display = "block";
            if (saveProfileGroup) saveProfileGroup.style.display = "none";
            if (saveCardGroup) saveCardGroup.style.display = "none";
        }
    });
}

if (orderSelectSignup) {
    orderSelectSignup.addEventListener('click', () => {
        orderModal.classList.remove('active');
        openedFromOrderFlow = true;
        currentMode = "signup";
        modalTitle.textContent = "Kayit Ol";
        if (nameGroup) nameGroup.style.display = "flex";
        if (nameInput) nameInput.setAttribute('required', 'required');
        confirmPasswordGroup.style.display = "flex";
        rememberMeGroup.style.display = "none";
        confirmPasswordInput.setAttribute('required', 'required');
        resetForm();
        authModal.classList.add('active');
    });
}

if (orderSelectLogin) {
    orderSelectLogin.addEventListener('click', () => {
        orderModal.classList.remove('active');
        openedFromOrderFlow = true;
        currentMode = "login";
        modalTitle.textContent = "Giris Yap";
        if (nameGroup) nameGroup.style.display = "none";
        if (nameInput) nameInput.removeAttribute('required');
        confirmPasswordGroup.style.display = "none";
        rememberMeGroup.style.display = "flex";
        confirmPasswordInput.removeAttribute('required');
        resetForm();
        authModal.classList.add('active');
    });
}

if (goToPaymentBtn && deliverySection && paymentSection) {
    goToPaymentBtn.addEventListener('click', () => {
        const requiredInputs = deliverySection.querySelectorAll('input[required]');
        let allValid = true;
        requiredInputs.forEach(input => {
            if (!input.value.trim() || !input.checkValidity()) {
                input.style.borderColor = "#dc2626";
                allValid = false;
            } else {
                input.style.borderColor = "var(--border-color)";
            }
        });
        if (allValid) {
            if (orderErrorBox) orderErrorBox.style.display = "none";
            deliverySection.style.display = "none";
            paymentSection.style.display = "block";
            const cardInputs = paymentSection.querySelectorAll('input');
            cardInputs.forEach(input => input.setAttribute('required', 'required'));
        } else {
            if (orderErrorBox) {
                orderErrorBox.textContent = "Lutfen alanlari eksiksiz giriniz.";
                orderErrorBox.style.display = "block";
            }
        }
    });
}

if (backToDeliveryBtn && deliverySection && paymentSection) {
    backToDeliveryBtn.addEventListener('click', () => {
        const cardInputs = paymentSection.querySelectorAll('input');
        cardInputs.forEach(input => input.removeAttribute('required'));
        paymentSection.style.display = "none";
        deliverySection.style.display = "block";
        if (orderErrorBox) orderErrorBox.style.display = "none";
    });
}

if (guestOrderForm) {
    guestOrderForm.setAttribute('novalidate', 'true');
    guestOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!orderErrorBox) return;
        orderErrorBox.style.display = "none";
        const saveProfileCheckbox = document.getElementById('saveProfileCheckbox');
        const saveCardCheckbox = document.getElementById('saveCardCheckbox');
        const orderData = {
            firstName: guestOrderForm.querySelector('#guestFirstName').value.trim(),
            lastName: guestOrderForm.querySelector('#guestLastName').value.trim(),
            email: guestOrderForm.querySelector('#guestEmail').value.trim(),
            phone: guestOrderForm.querySelector('#guestPhone').value.trim().replace(/\s+/g, ''),
            address: guestOrderForm.querySelector('#guestAddress').value.trim(),
            city: guestOrderForm.querySelector('#guestCity').value.trim(),
            district: guestOrderForm.querySelector('#guestDistrict').value.trim(),
            zipCode: guestOrderForm.querySelector('#guestZipCode').value.trim(),
            quantity: parseInt(guestOrderForm.querySelector('#guestQuantity').value) || 1,
            cardHolderName: guestOrderForm.querySelector('#cardHolderName').value.trim(),
            cardNumber: guestOrderForm.querySelector('#cardNumber').value.trim().replace(/\s+/g, ''),
            expireDate: guestOrderForm.querySelector('#expireDate').value.trim(),
            cvc: guestOrderForm.querySelector('#cvc').value.trim(),
            saveProfile: saveProfileCheckbox ? saveProfileCheckbox.checked : false,
            saveCard: saveCardCheckbox ? saveCardCheckbox.checked : false,
            isUserOrder: isLoggedIn
        };
        try {
            const response = await fetch('/api/guest-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(orderData)
            });
            const result = await response.json();
            if (result.success) {
                orderModal.classList.remove('active');
                alert(`Odemeniz basariyla alindi!\n\nSiparis Numaraniz: #${result.orderId}\n\nSag ustteki menuden siparislerinizi takip edebilirsiniz.`);
                if (isLoggedIn) fillSavedProfile(loggedInUserEmail);
            } else {
                orderErrorBox.textContent = result.message;
                orderErrorBox.style.display = "block";
            }
        } catch (error) {
            orderErrorBox.textContent = "Sunucu baglantisi basarisiz.";
            orderErrorBox.style.display = "block";
        }
    });
}

function loadSavedCredentials() {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail && emailInput && rememberMeCheckbox) {
        emailInput.value = savedEmail;
        rememberMeCheckbox.checked = true;
    }
}

function showError(message) { if (errorBox) { errorBox.textContent = message; errorBox.style.display = "block"; } }
function hideError() { if (errorBox) { errorBox.textContent = ""; errorBox.style.display = "none"; } }

function resetForm() {
    if (!authForm) return;
    authForm.reset();
    hideError();
    loadSavedCredentials();
    if (emailInput && passwordInput && confirmPasswordInput && nameInput) {
        emailInput.style.borderColor = "var(--border-color)";
        passwordInput.style.borderColor = "var(--border-color)";
        confirmPasswordInput.style.borderColor = "var(--border-color)";
        nameInput.style.borderColor = "var(--border-color)";
    }
}

async function handleAutoLogin() {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedHash = localStorage.getItem('rememberedHash');
    if (!savedEmail || !savedHash) return;
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ email: savedEmail, password: savedHash })
        });
        const result = await response.json();
        if (result.success) {
            isLoggedIn = true;
            loggedInUserEmail = savedEmail;
            loggedInUserName = result.name || localStorage.getItem('rememberedName') || "Kullanici";
            localStorage.setItem('rememberedName', loggedInUserName);
            updateAuthUI(loggedInUserName);
        }
    } catch (error) {
        console.error(error);
    }
}

document.addEventListener('DOMContentLoaded', handleAutoLogin);

if (loginBtn && signupBtn && authModal && closeModalBtn && authForm) {
    loginBtn.addEventListener('click', () => {
        openedFromOrderFlow = false;
        currentMode = "login";
        modalTitle.textContent = "Giris Yap";
        if (nameGroup) nameGroup.style.display = "none";
        if (nameInput) nameInput.removeAttribute('required');
        confirmPasswordGroup.style.display = "none";
        rememberMeGroup.style.display = "flex";
        confirmPasswordInput.removeAttribute('required');
        resetForm();
        authModal.classList.add('active');
    });
    signupBtn.addEventListener('click', () => {
        openedFromOrderFlow = false;
        currentMode = "signup";
        modalTitle.textContent = "Kayit Ol";
        if (nameGroup) nameGroup.style.display = "flex";
        if (nameInput) nameInput.setAttribute('required', 'required');
        confirmPasswordGroup.style.display = "flex";
        rememberMeGroup.style.display = "none";
        confirmPasswordInput.setAttribute('required', 'required');
        resetForm();
        authModal.classList.add('active');
    });
    closeModalBtn.addEventListener('click', () => authModal.classList.remove('active'));
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();
        const name = nameInput ? nameInput.value.trim() : "";
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        if (currentMode === "signup" && password !== confirmPassword) {
            showError("Sifreler uyusmuyor.");
            confirmPasswordInput.style.borderColor = "#dc2626";
            return;
        }
        const hashedTargetPassword = await sha256(password);
        const formData = currentMode === "signup" ? { email, password: hashedTargetPassword, name } : { email, password: hashedTargetPassword };
        const targetUrl = currentMode === "signup" ? '/api/signup' : '/api/login';
        try {
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(formData)
            });
            const result = await response.json();
            if (result.success) {
                isLoggedIn = true;
                loggedInUserEmail = email;
                loggedInUserName = result.name || name || "Kullanici";
                if (currentMode === "login" && rememberMeCheckbox.checked) {
                    localStorage.setItem('rememberedEmail', email);
                    localStorage.setItem('rememberedHash', hashedTargetPassword);
                    localStorage.setItem('rememberedName', loggedInUserName);
                } else if (currentMode === "login" && !rememberMeCheckbox.checked) {
                    localStorage.removeItem('rememberedEmail');
                    localStorage.removeItem('rememberedHash');
                    localStorage.removeItem('rememberedName');
                } else if (currentMode === "signup") {
                    localStorage.setItem('rememberedEmail', email);
                    localStorage.setItem('rememberedHash', hashedTargetPassword);
                    localStorage.setItem('rememberedName', loggedInUserName);
                }
                authModal.classList.remove('active');
                resetForm();
                updateAuthUI(loggedInUserName);
                if (openedFromOrderFlow && openOrderModalBtn) {
                    openOrderModalBtn.click();
                }
            } else {
                showError(result.message);
            }
        } catch (error) {
            showError("Hata olustu.");
        }
    });
}

if (emailInput && passwordInput && confirmPasswordInput && nameInput) {
    [emailInput, passwordInput, confirmPasswordInput, nameInput].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                input.style.borderColor = "var(--border-color)";
                hideError();
            });
        }
    });
}

const guestPhoneInput = document.getElementById('guestPhone');
if (guestPhoneInput) {
    guestPhoneInput.addEventListener('input', function (e) {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length === 0) { e.target.value = ''; return; }
        if (!val.startsWith('0')) { val = '0' + val; }
        val = val.substring(0, 11);
        let formatted = val.substring(0, 4);
        if (val.length > 4) formatted += ' ' + val.substring(4, 7);
        if (val.length > 7) formatted += ' ' + val.substring(7, 9);
        if (val.length > 9) formatted += ' ' + val.substring(9, 11);
        e.target.value = formatted;
    });
}

const cardNumberInput = document.getElementById('cardNumber');
if (cardNumberInput) {
    cardNumberInput.addEventListener('input', function (e) {
        let val = e.target.value.replace(/\D/g, '');
        val = val.substring(0, 16);
        let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
        e.target.value = formatted;
    });
}

const expireDateInput = document.getElementById('expireDate');
if (expireDateInput) {
    expireDateInput.addEventListener('input', function (e) {
        let val = e.target.value.replace(/\D/g, '');
        val = val.substring(0, 4);
        if (val.length > 2) {
            e.target.value = val.substring(0, 2) + '/' + val.substring(2, 4);
        } else {
            e.target.value = val;
        }
    });
    expireDateInput.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && e.target.value.length === 3) {
            e.target.value = e.target.value.substring(0, 2);
        }
    });
}

if (closeProfileModalBtn) closeProfileModalBtn.addEventListener('click', () => profileModal.classList.remove('active'));
if (closeOrdersModalBtn) closeOrdersModalBtn.addEventListener('click', () => ordersModal.classList.remove('active'));

const profilePhoneInput = document.getElementById('profilePhone');
if (profilePhoneInput) {
    profilePhoneInput.addEventListener('input', function (e) {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length === 0) { e.target.value = ''; return; }
        if (!val.startsWith('0')) { val = '0' + val; }
        val = val.substring(0, 11);
        let formatted = val.substring(0, 4);
        if (val.length > 4) formatted += ' ' + val.substring(4, 7);
        if (val.length > 7) formatted += ' ' + val.substring(7, 9);
        if (val.length > 9) formatted += ' ' + val.substring(9, 11);
        e.target.value = formatted;
    });
}

if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
        const profileData = {
            email: loggedInUserEmail,
            firstName: document.getElementById('profileFirstName').value.trim(),
            lastName: document.getElementById('profileLastName').value.trim(),
            phone: document.getElementById('profilePhone').value.trim().replace(/\s+/g, ''),
            address: document.getElementById('profileAddress').value.trim(),
            city: document.getElementById('profileCity').value.trim(),
            district: document.getElementById('profileDistrict').value.trim(),
            zipCode: document.getElementById('profileZip').value.trim()
        };
        if (!profileData.firstName || !profileData.lastName) {
            alert("Eksik bilgi!");
            return;
        }
        try {
            const response = await fetch('/api/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(profileData)
            });
            const result = await response.json();
            if (result.success) {
                alert("Guncellendi!");
                loggedInUserName = profileData.firstName;
                localStorage.setItem('rememberedName', loggedInUserName);
                updateAuthUI(loggedInUserName);
                document.getElementById('profileModal').classList.remove('active');
            } else {
                alert(result.message);
            }
        } catch (error) {
            alert("Hata");
        }
    });
}