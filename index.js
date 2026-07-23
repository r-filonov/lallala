import { saveSettingsDebounced } from '../../../../script.js';

const EXT_NAME = 'icon-overhaul';

// Дефолтные настройки
function loadSettings() {
    if (!extension_settings[EXT_NAME]) {
        extension_settings[EXT_NAME] = {
            fontDataUrl: '',
            svgIcons: [] // массив объектов { faClass: '', url: '' }
        };
    }
    return extension_settings[EXT_NAME];
}

// -------------------------------
// ЛОГИКА 1: КАСТОМНЫЙ ШРИФТ
// -------------------------------
function applyFont(dataUrl) {
    let styleTag = document.getElementById('st-custom-font-style');
    if (!dataUrl) {
        if (styleTag) styleTag.remove();
        return;
    }
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'st-custom-font-style';
        document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
        @font-face {
            font-family: 'Font Awesome 6 Free';
            font-style: normal;
            font-weight: 900;
            src: url('${dataUrl}') format('woff2') !important;
        }
        @font-face {
            font-family: 'Font Awesome 6 Free';
            font-style: normal;
            font-weight: 400;
            src: url('${dataUrl}') format('woff2') !important;
        }
        @font-face {
            font-family: 'Font Awesome 6 Brands';
            font-style: normal;
            font-weight: 400;
            src: url('${dataUrl}') format('woff2') !important;
        }
    `;
}

// -------------------------------
// ЛОГИКА 2: ТОЧЕЧНЫЕ SVG
// -------------------------------
function applySVGs(svgIcons) {
    let styleTag = document.getElementById('st-custom-svg-style');
    if (!svgIcons || svgIcons.length === 0) {
        if (styleTag) styleTag.remove();
        return;
    }
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'st-custom-svg-style';
        document.head.appendChild(styleTag);
    }
    
    let cssRules = '';
    svgIcons.forEach(item => {
        if (item.faClass && item.url) {
            let cleanClass = item.faClass.replace('.', '').trim(); // убираем точку, если юзер случайно ввел
            cssRules += `
                .${cleanClass}::before {
                    content: '' !important;
                    display: inline-block !important;
                    width: 1em !important;
                    height: 1em !important;
                    -webkit-mask: url('${item.url}') no-repeat center / contain !important;
                    mask: url('${item.url}') no-repeat center / contain !important;
                    background-color: currentColor !important;
                }
            `;
        }
    });
    styleTag.innerHTML = cssRules;
}

// Отрисовка полей ввода SVG
function renderSvgUI(settings) {
    const list = document.getElementById('st-svg-list');
    list.innerHTML = '';
    settings.svgIcons.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'flex-container flexFlowRow gap-2';
        row.innerHTML = `
            <input type="text" class="text_pole flex1 fa-class-input" placeholder="fa-gear" value="${item.faClass}">
            <input type="text" class="text_pole flex2 svg-url-input" placeholder="Прямая ссылка на .svg" value="${item.url}">
            <div class="menu_button red remove-svg-btn" data-index="${index}" style="min-width: 40px; text-align: center; cursor: pointer;">❌</div>
        `;
        list.appendChild(row);
    });

    document.querySelectorAll('.remove-svg-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            settings.svgIcons.splice(idx, 1);
            renderSvgUI(settings);
        });
    });
}

// -------------------------------
// ИНИЦИАЛИЗАЦИЯ И СЛУШАТЕЛИ
// -------------------------------
jQuery(async () => {
    // Подгружаем UI
    const html = await $.get(`${getContext().extensionFolderPath}/third-party/${EXT_NAME}/index.html`);
    $('#extensions_settings').append(html);

    const settings = loadSettings();
    applyFont(settings.fontDataUrl);
    applySVGs(settings.svgIcons);
    renderSvgUI(settings);

    // --- События Шрифта ---
    $('#st-icon-font-apply').on('click', () => {
        const fileInput = document.getElementById('st-icon-font-file');
        if (!fileInput.files.length) {
            toastr.warning('Сначала выберите файл .woff2');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            settings.fontDataUrl = e.target.result;
            saveSettingsDebounced();
            applyFont(settings.fontDataUrl);
            toastr.success('Кастомный шрифт успешно загружен!');
        };
        reader.readAsDataURL(fileInput.files[0]);
    });

    $('#st-icon-font-reset').on('click', () => {
        settings.fontDataUrl = '';
        saveSettingsDebounced();
        applyFont('');
        document.getElementById('st-icon-font-file').value = '';
        toastr.info('Возвращен стандартный шрифт FontAwesome.');
    });

    // --- События SVG ---
    $('#st-svg-add-btn').on('click', () => {
        settings.svgIcons.push({ faClass: '', url: '' });
        renderSvgUI(settings);
    });

    $('#st-svg-save-btn').on('click', () => {
        const classInputs = document.querySelectorAll('.fa-class-input');
        const urlInputs = document.querySelectorAll('.svg-url-input');
        
        settings.svgIcons = [];
        classInputs.forEach((input, i) => {
            if (input.value.trim() || urlInputs[i].value.trim()) {
                settings.svgIcons.push({
                    faClass: input.value.trim(),
                    url: urlInputs[i].value.trim()
                });
            }
        });

        saveSettingsDebounced();
        applySVGs(settings.svgIcons);
        toastr.success('Настройки SVG сохранены!');
    });
});
