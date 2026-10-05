let currentColor = '#C41E3A';
let currentStyle = 'classic';
let qrCode = null;

// Configuración de estilos
const styleConfigs = {
    classic: {
        dotsOptions: { type: 'square' },
        cornersSquareOptions: { type: 'square' },
        cornersDotOptions: { type: 'square' }
    },
    rounded: {
        dotsOptions: { type: 'rounded' },
        cornersSquareOptions: { type: 'extra-rounded' },
        cornersDotOptions: { type: 'dot' }
    },
    dots: {
        dotsOptions: { type: 'dots' },
        cornersSquareOptions: { type: 'dot' },
        cornersDotOptions: { type: 'dot' }
    }
};

function init() {
    const defaultUrl = window.location.origin + window.location.pathname.replace('qr.html', '') + 'index.html';
    document.getElementById('qr-url').value = defaultUrl;
    
    document.getElementById('qr-url').addEventListener('input', generateQR);
    document.getElementById('qr-text').addEventListener('input', updateText);
    
    generateQR();
}

function selectColor(element) {
    document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    currentColor = element.dataset.color;
    generateQR();
}

function selectStyle(element) {
    document.querySelectorAll('.style-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    currentStyle = element.dataset.style;
    generateQR();
}

function updateText() {
    const text = document.getElementById('qr-text').value || '¡Escanea y pide ahora!';
    document.getElementById('qr-text-display').textContent = text.toUpperCase();
}

function generateQR() {
    const url = document.getElementById('qr-url').value || 'https://doriteque.github.io';
    const showLogo = document.getElementById('show-logo').checked;
    const showFrame = document.getElementById('show-frame').checked;
    
    // Limpiar QR anterior
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    
    const styleConfig = styleConfigs[currentStyle] || styleConfigs.classic;
    
    // Crear QR con qr-code-styling
    qrCode = new QRCodeStyling({
        width: 220,
        height: 220,
        data: url,
        image: showLogo ? 'assets/logo.png' : undefined,
        dotsOptions: {
            color: currentColor,
            type: styleConfig.dotsOptions.type
        },
        cornersSquareOptions: {
            color: currentColor,
            type: styleConfig.cornersSquareOptions.type
        },
        cornersDotOptions: {
            color: currentColor,
            type: styleConfig.cornersDotOptions.type
        },
        imageOptions: {
            hideBackgroundDots: true,
            imageSize: 0.35,
            margin: 8
        },
        backgroundOptions: {
            color: '#ffffff'
        },
        qrOptions: {
            errorCorrectionLevel: 'H'
        }
    });
    
    qrCode.append(qrContainer);
    
    // Mostrar/ocultar marco
    const frameBorder = document.getElementById('qr-frame-border');
    frameBorder.style.display = showFrame ? 'block' : 'none';
    
    // Actualizar colores de la tarjeta
    document.querySelector('.qr-card-header h3').style.color = currentColor;
    document.querySelector('.qr-logo-top').style.borderColor = currentColor;
    document.querySelector('.qr-text-display').style.color = currentColor;
    document.querySelector('.qr-social').style.color = currentColor;
}

async function downloadQR() {
    const qrCard = document.getElementById('qr-card');
    const btn = document.querySelector('.btn-download');
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando...';
    btn.disabled = true;
    
    try {
        const canvas = await html2canvas(qrCard, {
            scale: 3,
            backgroundColor: null,
            useCORS: true,
            allowTaint: true
        });
        
        const link = document.createElement('a');
        link.download = 'doriteque-qr.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        btn.innerHTML = '<i class="fa-solid fa-check"></i> ¡Descargado!';
        setTimeout(() => {
            btn.innerHTML = '<i class="fa-solid fa-download"></i> Descargar QR (PNG)';
            btn.disabled = false;
        }, 2000);
    } catch (error) {
        console.error(error);
        alert('Error al generar la imagen. Intenta de nuevo.');
        btn.innerHTML = '<i class="fa-solid fa-download"></i> Descargar QR (PNG)';
        btn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', init);