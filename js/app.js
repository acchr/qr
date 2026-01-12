/**
 * CodeCraft128
 * Main application JavaScript
 */

// Configuration
const CONFIG = {
    BARCODE: {
        FORMAT: 'CODE128',
        WIDTH: 2,
        HEIGHT: 100,
        FONT_SIZE: 16,
        MARGIN: 10
    },
    DOWNLOAD: {
        DELAY: 300,
        MAX_FILENAME_LENGTH: 50,
        PREFIX: 'bbc-'
    },
    VALIDATION: {
        MAX_INPUT_LENGTH: 1000,
        MAX_LINES: 100
    },
    NOTIFICATION: {
        DEFAULT_DURATION: 3000,
        SUCCESS_DURATION: 2000,
        ERROR_DURATION: 5000
    }
};

// Application State
let barcodeCounter = 0;
let currentInputMode = 'single';
let barcodeData = [];
let overlayImage = null; // Store the overlay image
let imagePosition = 'right'; // 'left', 'right', 'over' (above), or 'under'
let imageSize = 100; // Percentage (25-200)
let barcodeOrientation = 0; // Rotation angle in degrees: 0, 90, 180, or 270
let downloadScale = 1.0; // Scale factor for download resolution (0.5 to 3.0)

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    registerServiceWorker();
});

/**
 * Register Service Worker for PWA functionality
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then((registration) => {
                    console.log('Service Worker registered successfully:', registration.scope);
                    
                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New service worker available
                                if (confirm('A new version is available! Reload to update?')) {
                                    window.location.reload();
                                }
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.log('Service Worker registration failed:', error);
                });
        });
    }
}

/**
 * Initialize the application
 */
function initializeApp() {
    setupEventListeners();
    setupKeyboardShortcuts();
    checkLibraryAvailability();
    
    // Initialize image size display
    const sizeSlider = document.getElementById('imageSize');
    if (sizeSlider) {
        imageSize = parseInt(sizeSlider.value);
        document.getElementById('imageSizeValue').textContent = imageSize;
    }
    
    // Initialize image position
    const positionSelect = document.getElementById('imagePosition');
    if (positionSelect) {
        imagePosition = positionSelect.value;
    }
    
    // Initialize barcode orientation
    const orientationSelect = document.getElementById('barcodeOrientation');
    if (orientationSelect) {
        barcodeOrientation = parseInt(orientationSelect.value);
    }
    
    // Initialize download scale
    const scaleSlider = document.getElementById('downloadScale');
    if (scaleSlider) {
        downloadScale = parseFloat(scaleSlider.value);
        document.getElementById('downloadScaleValue').textContent = downloadScale.toFixed(1);
    }
}


/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Mode toggle buttons
    document.getElementById('mode-single').addEventListener('click', () => switchInputMode('single'));
    document.getElementById('mode-multiple').addEventListener('click', () => switchInputMode('multiple'));
    
    // Generate button
    document.getElementById('generateBtn').addEventListener('click', generateBarcode);
    
    // Clear button
    document.getElementById('clearAllBtn').addEventListener('click', clearAllBarcodes);
    
    // Download all buttons
    document.getElementById('downloadAllBtn').addEventListener('click', downloadAllBarcodes);
    document.getElementById('downloadAllIndividuallyBtn').addEventListener('click', downloadAllBarcodesIndividually);
    
    // Advanced options toggle
    document.getElementById('advancedToggle').addEventListener('click', toggleAdvancedOptions);
    
    // Overlay image toggle
    document.getElementById('overlayImageToggle').addEventListener('change', handleOverlayToggle);
    
    // Image upload
    document.getElementById('overlayImageInput').addEventListener('change', handleImageUpload);
    
    // Remove image button
    document.getElementById('removeImageBtn').addEventListener('click', removeOverlayImage);
    
    // Image position
    document.getElementById('imagePosition').addEventListener('change', handleImagePositionChange);
    
    // Image size
    const imageSizeSlider = document.getElementById('imageSize');
    imageSizeSlider.addEventListener('input', handleImageSizeChange);
    imageSizeSlider.addEventListener('change', handleImageSizeChange);
    
    // Barcode orientation
    document.getElementById('barcodeOrientation').addEventListener('change', handleBarcodeOrientationChange);
    
    // Download scale
    const downloadScaleSlider = document.getElementById('downloadScale');
    downloadScaleSlider.addEventListener('input', handleDownloadScaleChange);
    downloadScaleSlider.addEventListener('change', handleDownloadScaleChange);
    
    // Input validation
    const singleInput = document.getElementById('barcodeText');
    const multipleInput = document.getElementById('barcodeTextMultiple');
    
    singleInput.addEventListener('input', () => validateInput(singleInput, 'single'));
    multipleInput.addEventListener('input', () => validateInput(multipleInput, 'multiple'));
    
    // Enter key support
    singleInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            generateBarcode();
        }
    });
    
    multipleInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            generateBarcode();
        }
    });
    
    // Event delegation for dynamically created download buttons
    document.getElementById('barcodeContainer').addEventListener('click', function(e) {
        if (e.target.classList.contains('download-btn') || e.target.closest('.download-btn')) {
            const button = e.target.classList.contains('download-btn') ? e.target : e.target.closest('.download-btn');
            const id = parseInt(button.getAttribute('data-barcode-id'));
            const text = button.getAttribute('data-barcode-text');
            if (id && text) {
                downloadBarcode(id, text);
            }
        }
    });
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + D to download all
        if ((e.ctrlKey || e.metaKey) && e.key === 'd' && !e.shiftKey) {
            e.preventDefault();
            if (barcodeData.length > 0) {
                downloadAllBarcodes();
            }
        }
        
        // Escape to clear input (when input is focused)
        if (e.key === 'Escape' && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
            e.target.value = '';
            e.target.blur();
            validateInput(e.target, currentInputMode);
        }
    });
}

/**
 * Check if required libraries are available
 */
function checkLibraryAvailability() {
    // Libraries are loaded asynchronously, so we check on first use
    // This is handled in the respective functions
}

/**
 * Switch input mode between single and multiple
 * @param {string} mode - 'single' or 'multiple'
 */
function switchInputMode(mode) {
    currentInputMode = mode;
    const singleGroup = document.getElementById('single-input-group');
    const multipleGroup = document.getElementById('multiple-input-group');
    const singleBtn = document.getElementById('mode-single');
    const multipleBtn = document.getElementById('mode-multiple');

    if (mode === 'single') {
        singleGroup.style.display = 'block';
        multipleGroup.style.display = 'none';
        singleBtn.classList.add('active');
        multipleBtn.classList.remove('active');
        singleBtn.setAttribute('aria-pressed', 'true');
        multipleBtn.setAttribute('aria-pressed', 'false');
        document.getElementById('barcodeText').focus();
    } else {
        singleGroup.style.display = 'none';
        multipleGroup.style.display = 'block';
        singleBtn.classList.remove('active');
        multipleBtn.classList.add('active');
        singleBtn.setAttribute('aria-pressed', 'false');
        multipleBtn.setAttribute('aria-pressed', 'true');
        document.getElementById('barcodeTextMultiple').focus();
    }
}

/**
 * Toggle advanced options section
 */
function toggleAdvancedOptions() {
    const toggle = document.getElementById('advancedToggle');
    const content = document.getElementById('advancedOptions');
    const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
    
    if (isExpanded) {
        content.style.display = 'none';
        toggle.setAttribute('aria-expanded', 'false');
    } else {
        content.style.display = 'block';
        toggle.setAttribute('aria-expanded', 'true');
    }
}

/**
 * Handle overlay image toggle
 */
function handleOverlayToggle() {
    const toggle = document.getElementById('overlayImageToggle');
    const uploadGroup = document.getElementById('imageUploadGroup');
    
    if (toggle.checked) {
        uploadGroup.style.display = 'block';
    } else {
        uploadGroup.style.display = 'none';
        removeOverlayImage();
    }
}

/**
 * Handle image upload
 */
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) {
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showNotification('Please select a valid image file', 'error');
        e.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            overlayImage = img;
            const preview = document.getElementById('previewImage');
            const previewContainer = document.getElementById('imagePreview');
            const helpText = document.getElementById('image-preview-help');
            
            preview.src = event.target.result;
            previewContainer.style.display = 'block';
            helpText.textContent = `Image loaded: ${file.name} (${img.width}×${img.height}px)`;
            helpText.className = 'input-feedback success';
        };
        img.onerror = function() {
            showNotification('Failed to load image', 'error');
            e.target.value = '';
            overlayImage = null;
        };
        img.src = event.target.result;
    };
    reader.onerror = function() {
        showNotification('Error reading image file', 'error');
        e.target.value = '';
        overlayImage = null;
    };
    reader.readAsDataURL(file);
}

/**
 * Remove overlay image
 */
function removeOverlayImage() {
    overlayImage = null;
    document.getElementById('overlayImageInput').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('previewImage').src = '';
    document.getElementById('image-preview-help').textContent = '';
    document.getElementById('overlayImageToggle').checked = false;
    document.getElementById('imageUploadGroup').style.display = 'none';
    
    // Hide all image containers
    document.querySelectorAll('[id^="image-container-"]').forEach(container => {
        container.style.display = 'none';
    });
}

/**
 * Handle image position change
 */
function handleImagePositionChange() {
    const positionSelect = document.getElementById('imagePosition');
    imagePosition = positionSelect.value;
    
    // Update all existing barcodes
    if (overlayImage && document.getElementById('overlayImageToggle').checked) {
        barcodeData.forEach(barcode => {
            addImageNextToBarcode(barcode.id);
        });
    }
}

/**
 * Handle image size change
 */
function handleImageSizeChange() {
    const sizeSlider = document.getElementById('imageSize');
    imageSize = parseInt(sizeSlider.value);
    document.getElementById('imageSizeValue').textContent = imageSize;
    
    // Update all existing barcodes
    if (overlayImage && document.getElementById('overlayImageToggle').checked) {
        barcodeData.forEach(barcode => {
            addImageNextToBarcode(barcode.id);
        });
    }
}

/**
 * Handle barcode orientation change
 */
function handleBarcodeOrientationChange() {
    const orientationSelect = document.getElementById('barcodeOrientation');
    barcodeOrientation = parseInt(orientationSelect.value);
    
    // Update all existing barcodes
    barcodeData.forEach(barcode => {
        applyBarcodeOrientation(barcode.id);
    });
}

/**
 * Apply orientation to a barcode
 * @param {number} barcodeId - Barcode ID
 */
function applyBarcodeOrientation(barcodeId) {
    const wrapper = document.getElementById(`barcode-wrapper-${barcodeId}`);
    if (!wrapper) {
        return;
    }
    
    const barcodeElement = wrapper.querySelector('svg, canvas');
    if (!barcodeElement) {
        return;
    }
    
    // Apply rotation transform
    if (barcodeOrientation === 0) {
        barcodeElement.style.transform = 'none';
    } else {
        barcodeElement.style.transform = `rotate(${barcodeOrientation}deg)`;
    }
    
    // Adjust container size for rotated barcodes
    if (barcodeOrientation === 90 || barcodeOrientation === 270) {
        // For 90/270 degree rotations, swap width and height considerations
        wrapper.style.display = 'inline-block';
    } else {
        wrapper.style.display = 'inline-block';
    }
}

/**
 * Handle download scale change
 */
function handleDownloadScaleChange() {
    const scaleSlider = document.getElementById('downloadScale');
    downloadScale = parseFloat(scaleSlider.value);
    document.getElementById('downloadScaleValue').textContent = downloadScale.toFixed(1);
}

/**
 * Validate input and show feedback
 * @param {HTMLElement} input - Input element to validate
 * @param {string} mode - Input mode
 */
function validateInput(input, mode) {
    const feedback = input.parentElement.querySelector('.input-feedback') || 
                     createFeedbackElement(input.parentElement);
    const value = input.value.trim();
    
    // Remove error class
    input.classList.remove('error');
    feedback.className = 'input-feedback';
    
    if (mode === 'single') {
        if (value.length === 0) {
            return true; // Empty is OK, just no feedback
        }
        if (value.length > CONFIG.VALIDATION.MAX_INPUT_LENGTH) {
            input.classList.add('error');
            feedback.className = 'input-feedback error';
            feedback.textContent = `Input too long (max ${CONFIG.VALIDATION.MAX_INPUT_LENGTH} characters)`;
            return false;
        }
        feedback.className = 'input-feedback success';
        feedback.textContent = `${value.length} character${value.length !== 1 ? 's' : ''}`;
    } else {
        const lines = value.split('\n').filter(line => line.trim().length > 0);
        if (lines.length === 0) {
            return true;
        }
        if (lines.length > CONFIG.VALIDATION.MAX_LINES) {
            input.classList.add('error');
            feedback.className = 'input-feedback error';
            feedback.textContent = `Too many lines (max ${CONFIG.VALIDATION.MAX_LINES})`;
            return false;
        }
        const totalChars = value.length;
        feedback.className = 'input-feedback info';
        feedback.textContent = `${lines.length} line${lines.length !== 1 ? 's' : ''}, ${totalChars} characters`;
    }
    
    return true;
}

/**
 * Create feedback element for input
 * @param {HTMLElement} parent - Parent element
 * @returns {HTMLElement} Feedback element
 */
function createFeedbackElement(parent) {
    const feedback = document.createElement('div');
    feedback.className = 'input-feedback';
    parent.appendChild(feedback);
    return feedback;
}

/**
 * Generate barcode(s) from input
 */
function generateBarcode() {
    let texts = [];

    if (currentInputMode === 'single') {
        const input = document.getElementById('barcodeText');
        const text = input.value.trim();
        if (!text) {
            showNotification('Please enter text to generate barcode', 'error');
            input.focus();
            return;
        }
        if (text.length > CONFIG.VALIDATION.MAX_INPUT_LENGTH) {
            showNotification(`Input too long (max ${CONFIG.VALIDATION.MAX_INPUT_LENGTH} characters)`, 'error');
            return;
        }
        texts = [text];
        input.value = '';
        validateInput(input, 'single');
    } else {
        const textArea = document.getElementById('barcodeTextMultiple');
        const lines = textArea.value.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length === 0) {
            showNotification('Please enter at least one line of text', 'error');
            textArea.focus();
            return;
        }
        if (lines.length > CONFIG.VALIDATION.MAX_LINES) {
            showNotification(`Too many lines (max ${CONFIG.VALIDATION.MAX_LINES})`, 'error');
            return;
        }
        texts = lines;
        textArea.value = '';
        validateInput(textArea, 'multiple');
    }

    // Create barcode rows
    const container = document.getElementById('barcodeContainer');
    const buttonGroup = document.getElementById('buttonGroup');
    
    // Remove empty state if exists
    if (container.querySelector('.empty-state')) {
        container.innerHTML = '';
        buttonGroup.style.display = 'flex';
    }

    // Generate barcode for each text
    texts.forEach((text, index) => {
        setTimeout(() => {
            generateSingleBarcode(text, container);
        }, index * 50); // Stagger generation slightly
    });
    
    showNotification(`Generating ${texts.length} barcode${texts.length !== 1 ? 's' : ''}...`, 'info', 1000);
}

/**
 * Generate a single barcode
 * @param {string} text - Text to encode
 * @param {HTMLElement} container - Container element
 */
function generateSingleBarcode(text, container) {
    barcodeCounter++;
    const rowId = `barcode-row-${barcodeCounter}`;
    
    const row = document.createElement('div');
    row.className = 'barcode-row';
    row.id = rowId;
    row.setAttribute('role', 'article');
    row.setAttribute('aria-label', `Barcode for ${escapeHtml(text)}`);
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'barcode-info';
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'barcode-label';
    labelDiv.textContent = text;
    
    const typeDiv = document.createElement('div');
    typeDiv.className = 'barcode-type';
    typeDiv.textContent = 'Type: Code-128';
    
    infoDiv.appendChild(labelDiv);
    infoDiv.appendChild(typeDiv);
    
    const displayDiv = document.createElement('div');
    displayDiv.className = 'barcode-display';
    
    // Create a container for barcode and image side by side
    const barcodeContainer = document.createElement('div');
    barcodeContainer.id = `barcode-container-${barcodeCounter}`;
    barcodeContainer.style.display = 'flex';
    barcodeContainer.style.alignItems = 'center';
    barcodeContainer.style.gap = '10px';
    
    // Create element for barcode (JsBarcode will create SVG, so we use a div wrapper)
    const barcodeWrapper = document.createElement('div');
    barcodeWrapper.id = `barcode-wrapper-${barcodeCounter}`;
    
    // Create canvas element - JsBarcode will replace it with SVG
    const barcodeElement = document.createElement('canvas');
    barcodeElement.id = `barcode-${barcodeCounter}`;
    barcodeElement.setAttribute('aria-label', `Barcode image for ${text}`);
    barcodeWrapper.appendChild(barcodeElement);
    barcodeContainer.appendChild(barcodeWrapper);
    
    // Create image container if overlay is enabled
    const imageContainer = document.createElement('div');
    imageContainer.id = `image-container-${barcodeCounter}`;
    imageContainer.style.display = 'none';
    barcodeContainer.appendChild(imageContainer);
    
    displayDiv.appendChild(barcodeContainer);
    
    const button = document.createElement('button');
    button.className = 'download-btn';
    button.id = `download-btn-${barcodeCounter}`;
    button.setAttribute('data-barcode-id', barcodeCounter);
    button.setAttribute('data-barcode-text', text);
    button.setAttribute('aria-label', `Download barcode for ${text}`);
    button.textContent = 'Download PNG';
    
    row.appendChild(infoDiv);
    row.appendChild(displayDiv);
    row.appendChild(button);
    
    container.appendChild(row);

    // Generate Code128 barcode using JsBarcode
    try {
        if (typeof JsBarcode === 'undefined') {
            throw new Error('Barcode library not loaded. Please refresh the page.');
        }
        
        JsBarcode(`#barcode-${barcodeCounter}`, text, {
            format: CONFIG.BARCODE.FORMAT,
            width: CONFIG.BARCODE.WIDTH,
            height: CONFIG.BARCODE.HEIGHT,
            displayValue: true,
            fontSize: CONFIG.BARCODE.FONT_SIZE,
            margin: CONFIG.BARCODE.MARGIN
        });

        // Wait for barcode to render, then apply orientation and add image if enabled
        setTimeout(() => {
            // JsBarcode may replace canvas with SVG, so we need to find the actual element
            const wrapper = document.getElementById(`barcode-wrapper-${barcodeCounter}`);
            if (wrapper) {
                // Update the ID on the actual barcode element (SVG or canvas)
                const actualBarcode = wrapper.querySelector('svg, canvas');
                if (actualBarcode && actualBarcode.id !== `barcode-${barcodeCounter}`) {
                    actualBarcode.id = `barcode-${barcodeCounter}`;
                }
            }
            
            // Apply orientation
            applyBarcodeOrientation(barcodeCounter);
            
            // Add image if enabled
            if (overlayImage && document.getElementById('overlayImageToggle').checked) {
                addImageNextToBarcode(barcodeCounter);
            }
        }, 200);

        // Store barcode data for batch download
        barcodeData.push({
            id: barcodeCounter,
            text: text,
            type: CONFIG.BARCODE.FORMAT
        });
    } catch (error) {
        console.error('Error generating barcode:', error);
        showNotification(`Error generating barcode for "${text}": ${error.message}`, 'error');
        row.remove();
    }
}

/**
 * Add image next to barcode
 * @param {number} barcodeId - Barcode ID
 */
function addImageNextToBarcode(barcodeId) {
    if (!overlayImage) {
        return;
    }
    
    const imageContainer = document.getElementById(`image-container-${barcodeId}`);
    const barcodeContainer = document.getElementById(`barcode-container-${barcodeId}`);
    if (!imageContainer || !barcodeContainer) {
        return;
    }
    
    // Clear any existing image
    imageContainer.innerHTML = '';
    
    // Calculate image size based on percentage
    const baseHeight = CONFIG.BARCODE.HEIGHT;
    const imageHeight = (baseHeight * imageSize) / 100;
    const maxWidth = 200 * (imageSize / 100);
    
    // Create image element
    const img = document.createElement('img');
    img.src = overlayImage.src;
    img.style.maxHeight = `${imageHeight}px`;
    img.style.maxWidth = `${maxWidth}px`;
    img.style.objectFit = 'contain';
    img.style.display = 'block';
    
    imageContainer.appendChild(img);
    imageContainer.style.display = 'block';
    
    // Update container layout based on position
    const wrapper = document.getElementById(`barcode-wrapper-${barcodeId}`);
    
    if (imagePosition === 'over') {
        // Position image above the barcode (opposite of under)
        barcodeContainer.style.position = 'relative';
        barcodeContainer.style.flexDirection = 'column';
        barcodeContainer.style.alignItems = 'center';
        imageContainer.style.position = 'static';
        imageContainer.style.transform = 'none';
        imageContainer.style.zIndex = 'auto';
        // Ensure image comes first, then barcode
        if (wrapper && wrapper.previousSibling !== imageContainer) {
            barcodeContainer.insertBefore(imageContainer, wrapper);
        }
    } else if (imagePosition === 'under') {
        barcodeContainer.style.position = 'relative';
        barcodeContainer.style.flexDirection = 'column';
        barcodeContainer.style.alignItems = 'center';
        imageContainer.style.position = 'static';
        imageContainer.style.transform = 'none';
        imageContainer.style.zIndex = 'auto';
        // Ensure wrapper comes first, then image
        if (wrapper && wrapper.nextSibling !== imageContainer) {
            barcodeContainer.appendChild(wrapper);
            barcodeContainer.appendChild(imageContainer);
        }
    } else {
        barcodeContainer.style.position = 'relative';
        barcodeContainer.style.flexDirection = 'row';
        barcodeContainer.style.alignItems = 'center';
        imageContainer.style.position = 'static';
        imageContainer.style.transform = 'none';
        imageContainer.style.zIndex = 'auto';
        
        // Reorder elements based on position
        if (imagePosition === 'left') {
            // Image should come before barcode
            if (wrapper && wrapper.previousSibling !== imageContainer) {
                barcodeContainer.insertBefore(imageContainer, wrapper);
            }
        } else {
            // right position - image should come after barcode
            if (wrapper && wrapper.nextSibling !== imageContainer) {
                barcodeContainer.appendChild(imageContainer);
            }
        }
    }
}

/**
 * Create combined canvas with barcode and image side by side
 * @param {number} barcodeId - Barcode ID
 * @returns {Promise<HTMLCanvasElement>} Combined canvas
 */
async function createCombinedCanvas(barcodeId) {
    return new Promise((resolve, reject) => {
        // Find barcode element - it might be SVG or canvas, and might be in a wrapper
        let barcodeElement = document.getElementById(`barcode-${barcodeId}`);
        if (!barcodeElement) {
            // Try to find it in the wrapper
            const wrapper = document.getElementById(`barcode-wrapper-${barcodeId}`);
            if (wrapper) {
                barcodeElement = wrapper.querySelector('svg, canvas');
            }
        }
        
        const imageContainer = document.getElementById(`image-container-${barcodeId}`);
        
        if (!barcodeElement) {
            reject(new Error('Barcode element not found'));
            return;
        }
        
        // Get barcode dimensions
        let barcodeWidth, barcodeHeight;
        let barcodeImg;
        
        if (barcodeElement.tagName === 'SVG') {
            const svg = barcodeElement;
            const viewBox = svg.getAttribute('viewBox');
            if (viewBox) {
                const parts = viewBox.split(' ');
                barcodeWidth = parseInt(parts[2]) || svg.clientWidth;
                barcodeHeight = parseInt(parts[3]) || svg.clientHeight;
            } else {
                barcodeWidth = parseInt(svg.getAttribute('width')) || svg.clientWidth;
                barcodeHeight = parseInt(svg.getAttribute('height')) || svg.clientHeight;
            }
            
            // Convert SVG to image
            const svgData = new XMLSerializer().serializeToString(svg);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            barcodeImg = new Image();
            barcodeImg.onload = function() {
                URL.revokeObjectURL(url);
                createCombinedCanvasFromImages(barcodeImg, barcodeWidth, barcodeHeight, imageContainer)
                    .then(resolve)
                    .catch(reject);
            };
            barcodeImg.onerror = function() {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to convert SVG to image'));
            };
            barcodeImg.src = url;
        } else if (barcodeElement.tagName === 'CANVAS') {
            barcodeWidth = barcodeElement.width;
            barcodeHeight = barcodeElement.height;
            barcodeImg = new Image();
            barcodeImg.onload = function() {
                createCombinedCanvasFromImages(barcodeImg, barcodeWidth, barcodeHeight, imageContainer)
                    .then(resolve)
                    .catch(reject);
            };
            barcodeImg.onerror = function() {
                reject(new Error('Failed to load barcode image'));
            };
            barcodeImg.src = barcodeElement.toDataURL();
        } else {
            reject(new Error('Unsupported barcode element type'));
        }
    });
}

/**
 * Create combined canvas from barcode and overlay images
 * @param {Image} barcodeImg - Barcode image
 * @param {number} barcodeWidth - Barcode width
 * @param {number} barcodeHeight - Barcode height
 * @param {HTMLElement} imageContainer - Image container element
 * @returns {Promise<HTMLCanvasElement>} Combined canvas
 */
function createCombinedCanvasFromImages(barcodeImg, barcodeWidth, barcodeHeight, imageContainer) {
    return new Promise((resolve, reject) => {
        const hasImage = overlayImage && imageContainer && imageContainer.style.display !== 'none';
        
        // Calculate image dimensions if present
        let imageWidth = 0;
        let imageHeight = 0;
        const spacing = hasImage ? 10 : 0;
        
        if (hasImage) {
            // Calculate image size based on percentage
            const baseHeight = barcodeHeight;
            imageHeight = (baseHeight * imageSize) / 100;
            
            // Maintain aspect ratio
            const aspectRatio = overlayImage.width / overlayImage.height;
            imageWidth = imageHeight * aspectRatio;
            
            // Limit max width for side positions (not for above/under)
            if (imagePosition !== 'under' && imagePosition !== 'over') {
                const maxWidth = 200 * (imageSize / 100);
                if (imageWidth > maxWidth) {
                    imageWidth = maxWidth;
                    imageHeight = imageWidth / aspectRatio;
                }
            }
        }
        
        // Calculate effective barcode dimensions considering rotation
        let effectiveBarcodeWidth = barcodeWidth;
        let effectiveBarcodeHeight = barcodeHeight;
        if (barcodeOrientation === 90 || barcodeOrientation === 270) {
            // For 90/270 degree rotations, swap dimensions
            effectiveBarcodeWidth = barcodeHeight;
            effectiveBarcodeHeight = barcodeWidth;
        }
        
        // Create combined canvas based on position
        let combinedCanvas = document.createElement('canvas');
        let barcodeX = 0, barcodeY = 0;
        let imageX = 0, imageY = 0;
        
        if (hasImage) {
            if (imagePosition === 'over') {
                // Image above barcode (opposite of under) - use effective dimensions for rotation
                combinedCanvas.width = Math.max(effectiveBarcodeWidth, imageWidth);
                combinedCanvas.height = imageHeight + spacing + effectiveBarcodeHeight;
                imageX = (combinedCanvas.width - imageWidth) / 2;
                imageY = 0;
                barcodeX = (combinedCanvas.width - barcodeWidth) / 2;
                barcodeY = imageHeight + spacing + (effectiveBarcodeHeight - barcodeHeight) / 2;
            } else if (imagePosition === 'under') {
                // Image below barcode
                combinedCanvas.width = Math.max(effectiveBarcodeWidth, imageWidth);
                combinedCanvas.height = effectiveBarcodeHeight + spacing + imageHeight;
                barcodeX = (combinedCanvas.width - barcodeWidth) / 2;
                barcodeY = (effectiveBarcodeHeight - barcodeHeight) / 2;
                imageX = (combinedCanvas.width - imageWidth) / 2;
                imageY = effectiveBarcodeHeight + spacing;
            } else if (imagePosition === 'left') {
                // Image to the left of barcode
                combinedCanvas.width = imageWidth + spacing + effectiveBarcodeWidth;
                combinedCanvas.height = Math.max(effectiveBarcodeHeight, imageHeight);
                imageX = 0;
                imageY = (combinedCanvas.height - imageHeight) / 2;
                barcodeX = imageWidth + spacing + (effectiveBarcodeWidth - barcodeWidth) / 2;
                barcodeY = (combinedCanvas.height - barcodeHeight) / 2;
            } else {
                // Image to the right of barcode (default)
                combinedCanvas.width = effectiveBarcodeWidth + spacing + imageWidth;
                combinedCanvas.height = Math.max(effectiveBarcodeHeight, imageHeight);
                barcodeX = (effectiveBarcodeWidth - barcodeWidth) / 2;
                barcodeY = (combinedCanvas.height - barcodeHeight) / 2;
                imageX = effectiveBarcodeWidth + spacing;
                imageY = (combinedCanvas.height - imageHeight) / 2;
            }
        } else {
            // No image, just barcode - use effective dimensions
            combinedCanvas.width = effectiveBarcodeWidth;
            combinedCanvas.height = effectiveBarcodeHeight;
            barcodeX = (effectiveBarcodeWidth - barcodeWidth) / 2;
            barcodeY = (effectiveBarcodeHeight - barcodeHeight) / 2;
        }
        
        const ctx = combinedCanvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);
        
        // Handle barcode rotation
        if (barcodeOrientation !== 0) {
            // Calculate rotation center
            const rotationCenterX = barcodeX + barcodeWidth / 2;
            const rotationCenterY = barcodeY + barcodeHeight / 2;
            
            // Save context, rotate, draw, restore
            ctx.save();
            ctx.translate(rotationCenterX, rotationCenterY);
            ctx.rotate((barcodeOrientation * Math.PI) / 180);
            ctx.drawImage(barcodeImg, -barcodeWidth / 2, -barcodeHeight / 2, barcodeWidth, barcodeHeight);
            ctx.restore();
        } else {
            // No rotation, draw normally
            ctx.drawImage(barcodeImg, barcodeX, barcodeY, barcodeWidth, barcodeHeight);
        }
        
        // Draw overlay image if present
        if (hasImage) {
            ctx.drawImage(overlayImage, imageX, imageY, imageWidth, imageHeight);
        }
        
        // Apply download scale
        const finalCanvas = applyDownloadScale(combinedCanvas);
        resolve(finalCanvas);
    });
}

/**
 * Apply download scale to a canvas
 * @param {HTMLCanvasElement} canvas - Canvas to scale
 * @returns {HTMLCanvasElement} Scaled canvas (or original if scale is 1.0)
 */
function applyDownloadScale(canvas) {
    if (downloadScale === 1.0) {
        return canvas;
    }
    
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = Math.round(canvas.width * downloadScale);
    scaledCanvas.height = Math.round(canvas.height * downloadScale);
    const scaledCtx = scaledCanvas.getContext('2d');
    
    // Use high-quality scaling
    scaledCtx.imageSmoothingEnabled = true;
    scaledCtx.imageSmoothingQuality = 'high';
    
    // Draw the original canvas scaled up/down
    scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
    
    return scaledCanvas;
}

/**
 * Validate canvas before conversion
 * @param {HTMLCanvasElement} canvas - Canvas to validate
 * @returns {boolean} True if canvas is valid
 */
function validateCanvas(canvas) {
    if (!canvas) {
        return false;
    }
    
    if (canvas.width === 0 || canvas.height === 0) {
        console.error('Canvas dimensions invalid:', canvas.width, canvas.height);
        return false;
    }
    
    // Check if canvas has content
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Cannot get canvas context');
        return false;
    }
    
    return true;
}

/**
 * Download a single barcode
 * @param {number} id - Barcode ID
 * @param {string} text - Barcode text
 */
async function downloadBarcode(id, text) {
    // Find barcode element - it might be SVG or canvas, and might be in a wrapper
    let barcodeElement = document.getElementById(`barcode-${id}`);
    if (!barcodeElement) {
        // Try to find it in the wrapper
        const wrapper = document.getElementById(`barcode-wrapper-${id}`);
        if (wrapper) {
            barcodeElement = wrapper.querySelector('svg, canvas');
        }
    }
    
    if (!barcodeElement) {
        showNotification('Barcode not found', 'error');
        return;
    }

    const button = document.getElementById(`download-btn-${id}`);
    const originalHTML = button ? button.innerHTML : '';
    
    if (button) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span>Preparing PNG...';
    }

    try {
        let canvas;
        
        // Check if overlay image is enabled
        if (overlayImage && document.getElementById('overlayImageToggle').checked) {
            // Create combined canvas with barcode and image
            canvas = await createCombinedCanvas(id);
        } else {
            // Use original barcode element
            if (barcodeElement.tagName === 'SVG') {
                // Convert SVG to canvas
                const svg = barcodeElement;
                const viewBox = svg.getAttribute('viewBox');
                let width, height;
                if (viewBox) {
                    const parts = viewBox.split(' ');
                    width = parseInt(parts[2]) || svg.clientWidth;
                    height = parseInt(parts[3]) || svg.clientHeight;
                } else {
                    width = parseInt(svg.getAttribute('width')) || svg.clientWidth;
                    height = parseInt(svg.getAttribute('height')) || svg.clientHeight;
                }
                
                canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                const svgData = new XMLSerializer().serializeToString(svg);
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);
                
                const img = new Image();
                await new Promise((resolve, reject) => {
                    img.onload = function() {
                        ctx.drawImage(img, 0, 0, width, height);
                        URL.revokeObjectURL(url);
                        resolve();
                    };
                    img.onerror = function() {
                        URL.revokeObjectURL(url);
                        reject(new Error('Failed to convert SVG to image'));
                    };
                    img.src = url;
                });
            } else {
                canvas = barcodeElement;
            }
        }

        // Validate canvas
        if (!validateCanvas(canvas)) {
            showNotification('Invalid barcode image', 'error');
            if (button) {
                button.innerHTML = originalHTML;
                button.disabled = false;
            }
            return;
        }

        // Apply download scale
        canvas = applyDownloadScale(canvas);

        await downloadCanvasAsImage(canvas, text, 'png', button, '', originalHTML);
        showNotification('Barcode downloaded successfully as PNG', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showNotification('Download failed: ' + error.message, 'error');
        if (button) {
            button.innerHTML = originalHTML;
            button.disabled = false;
        }
    }
}


/**
 * Download canvas as image (PNG, etc.)
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {string} text - Barcode text
 * @param {string} format - Image format (png, jpeg, webp)
 * @param {HTMLElement} button - Button element
 * @param {string} originalText - Original button text
 * @param {string} originalHTML - Original button HTML
 */
function downloadCanvasAsImage(canvas, text, format = 'png', button, originalText, originalHTML) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(function(blob) {
            if (!blob) {
                reject(new Error('Failed to create image blob'));
                return;
            }
            
            const filename = sanitizeFilename(text, format);
            downloadBlob(blob, filename);
            
            if (button) {
                button.innerHTML = originalHTML;
                button.disabled = false;
            }
            
            resolve();
        }, `image/${format}`);
    });
}

/**
 * Download a blob as a file
 * @param {Blob} blob - Blob to download
 * @param {string} filename - Filename
 */
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Sanitize filename for safe download
 * @param {string} text - Original text
 * @param {string} extension - File extension
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(text, extension = 'png') {
    const sanitized = text
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') // Remove invalid chars
        .replace(/\s+/g, '_') // Replace spaces
        .substring(0, CONFIG.DOWNLOAD.MAX_FILENAME_LENGTH)
        .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
    
    const prefix = CONFIG.DOWNLOAD.PREFIX;
    const ext = extension.startsWith('.') ? extension : `.${extension}`;
    
    return `${prefix}${sanitized || 'barcode'}${ext}`;
}

/**
 * Download all barcodes as ZIP
 */
async function downloadAllBarcodes() {
    const downloadBtn = document.getElementById('downloadAllBtn');
    const originalText = downloadBtn.textContent;
    
    if (barcodeData.length === 0) {
        showNotification('No barcodes to download', 'warning');
        return;
    }

    if (typeof JSZip === 'undefined') {
        showNotification('ZIP library not loaded. Please refresh the page.', 'error');
        return;
    }

    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '<span class="spinner-large"></span>Generating ZIP...';

    try {
        const zip = new JSZip();
        let processedCount = 0;
        const total = barcodeData.length;

        const readmeContent = `Code128 Barcode Images
Generated: ${new Date().toLocaleString()}
Total Files: ${barcodeData.length}

This ZIP file contains Code128 barcode images in PNG format.
All files are safe image files generated by CodeCraft128.

Files included:
`;
        let readmeText = readmeContent;
        
        // Process each barcode
        for (const barcode of barcodeData) {
            // Find barcode element - it might be SVG or canvas, and might be in a wrapper
            let barcodeElement = document.getElementById(`barcode-${barcode.id}`);
            if (!barcodeElement) {
                // Try to find it in the wrapper
                const wrapper = document.getElementById(`barcode-wrapper-${barcode.id}`);
                if (wrapper) {
                    barcodeElement = wrapper.querySelector('svg, canvas');
                }
            }
            
            if (!barcodeElement) {
                processedCount++;
                continue;
            }

            try {
                let canvas;
                
                // Check if overlay image is enabled
                if (overlayImage && document.getElementById('overlayImageToggle').checked) {
                    // Create combined canvas with barcode and image
                    canvas = await createCombinedCanvas(barcode.id);
                } else {
                    // Use original barcode element
                    if (barcodeElement.tagName === 'SVG') {
                        // Convert SVG to canvas
                        const svg = barcodeElement;
                        const viewBox = svg.getAttribute('viewBox');
                        let width, height;
                        if (viewBox) {
                            const parts = viewBox.split(' ');
                            width = parseInt(parts[2]) || svg.clientWidth;
                            height = parseInt(parts[3]) || svg.clientHeight;
                        } else {
                            width = parseInt(svg.getAttribute('width')) || svg.clientWidth;
                            height = parseInt(svg.getAttribute('height')) || svg.clientHeight;
                        }
                        
                        canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        
                        const svgData = new XMLSerializer().serializeToString(svg);
                        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                        const url = URL.createObjectURL(svgBlob);
                        
                        const img = new Image();
                        await new Promise((resolve, reject) => {
                            img.onload = function() {
                                ctx.drawImage(img, 0, 0, width, height);
                                URL.revokeObjectURL(url);
                                resolve();
                            };
                            img.onerror = function() {
                                URL.revokeObjectURL(url);
                                reject(new Error('Failed to convert SVG to image'));
                            };
                            img.src = url;
                        });
                    } else {
                        canvas = barcodeElement;
                    }
                }

                // Apply download scale
                canvas = applyDownloadScale(canvas);

                const imageBlob = await new Promise((resolve, reject) => {
                    canvas.toBlob(function(blob) {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create image blob'));
                        }
                    }, 'image/png');
                });

                const filename = sanitizeFilename(barcode.text, 'png');
                zip.file(filename, imageBlob);
                readmeText += `- ${filename} (Text: ${barcode.text})\n`;
            } catch (error) {
                console.error(`Error processing barcode ${barcode.id}:`, error);
            }
            
            processedCount++;
            downloadBtn.innerHTML = `<span class="spinner-large"></span>Processing ${processedCount}/${total}...`;
        }

        // Add README file to ZIP
        zip.file('README.txt', readmeText);

        // Generate ZIP file
        downloadBtn.innerHTML = '<span class="spinner-large"></span>Creating ZIP file...';
        const zipBlob = await zip.generateAsync({ 
            type: 'blob',
            compression: 'STORE',
            mimeType: 'application/zip',
            platform: 'DOS',
            date: new Date()
        });
        
        // Download ZIP
        const timestamp = new Date().getTime();
        const zipFilename = `barcodes-${timestamp}.zip`;
        downloadBlob(zipBlob, zipFilename);
        
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
        
        showNotification('ZIP file downloaded successfully!', 'success');
        
        // Show info about Windows Defender warning
        setTimeout(() => {
            showNotification(
                '⚠️ If Windows shows "potentially harmful" warning:\n\n' +
                'Method 1 (Recommended):\n' +
                '1. Right-click the ZIP file\n' +
                '2. Select "Properties"\n' +
                '3. At the bottom, check "Unblock"\n' +
                '4. Click "OK"\n' +
                '5. Now extract normally\n\n' +
                'Method 2:\n' +
                '1. Click "More info" on the warning\n' +
                '2. Click "Run anyway"\n\n' +
                'Note: This is a false positive. The ZIP only contains PNG image files.',
                'info',
                10000
            );
        }, 500);
    } catch (error) {
        console.error('Error creating ZIP:', error);
        showNotification('Error creating ZIP file: ' + error.message, 'error');
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
    }
}

/**
 * Download all barcodes individually
 */
async function downloadAllBarcodesIndividually() {
    const downloadBtn = document.getElementById('downloadAllIndividuallyBtn');
    const originalText = downloadBtn.textContent;
    
    if (barcodeData.length === 0) {
        showNotification('No barcodes to download', 'warning');
        return;
    }

    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '<span class="spinner-large"></span>Downloading...';

    try {
        let processedCount = 0;
        const total = barcodeData.length;

        for (const barcode of barcodeData) {
            // Find barcode element - it might be SVG or canvas, and might be in a wrapper
            let barcodeElement = document.getElementById(`barcode-${barcode.id}`);
            if (!barcodeElement) {
                // Try to find it in the wrapper
                const wrapper = document.getElementById(`barcode-wrapper-${barcode.id}`);
                if (wrapper) {
                    barcodeElement = wrapper.querySelector('svg, canvas');
                }
            }
            
            if (!barcodeElement) {
                processedCount++;
                continue;
            }

            try {
                let canvas;
                
                // Check if overlay image is enabled
                if (overlayImage && document.getElementById('overlayImageToggle').checked) {
                    // Create combined canvas with barcode and image
                    canvas = await createCombinedCanvas(barcode.id);
                } else {
                    // Use original barcode element
                    if (barcodeElement.tagName === 'SVG') {
                        // Convert SVG to canvas
                        const svg = barcodeElement;
                        const viewBox = svg.getAttribute('viewBox');
                        let width, height;
                        if (viewBox) {
                            const parts = viewBox.split(' ');
                            width = parseInt(parts[2]) || svg.clientWidth;
                            height = parseInt(parts[3]) || svg.clientHeight;
                        } else {
                            width = parseInt(svg.getAttribute('width')) || svg.clientWidth;
                            height = parseInt(svg.getAttribute('height')) || svg.clientHeight;
                        }
                        
                        canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        
                        const svgData = new XMLSerializer().serializeToString(svg);
                        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                        const url = URL.createObjectURL(svgBlob);
                        
                        const img = new Image();
                        await new Promise((resolve, reject) => {
                            img.onload = function() {
                                ctx.drawImage(img, 0, 0, width, height);
                                URL.revokeObjectURL(url);
                                resolve();
                            };
                            img.onerror = function() {
                                URL.revokeObjectURL(url);
                                reject(new Error('Failed to convert SVG to image'));
                            };
                            img.src = url;
                        });
                    } else {
                        canvas = barcodeElement;
                    }
                }

                // Apply download scale
                canvas = applyDownloadScale(canvas);

                const blob = await new Promise((resolve, reject) => {
                    canvas.toBlob(function(blob) {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create blob'));
                        }
                    }, 'image/png');
                });

                const filename = sanitizeFilename(barcode.text, 'png');
                downloadBlob(blob, filename);
            } catch (error) {
                console.error(`Error downloading barcode ${barcode.id}:`, error);
            }
            
            processedCount++;
            downloadBtn.innerHTML = `<span class="spinner-large"></span>Downloading ${processedCount}/${total}...`;
            
            // Small delay between downloads
            if (processedCount < total) {
                await new Promise(resolve => setTimeout(resolve, CONFIG.DOWNLOAD.DELAY));
            }
        }

        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
        showNotification(`Successfully downloaded ${total} barcode image${total !== 1 ? 's' : ''}!`, 'success');
    } catch (error) {
        console.error('Error downloading files:', error);
        showNotification('Error downloading files: ' + error.message, 'error');
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
    }
}

/**
 * Clear all barcodes
 */
function clearAllBarcodes() {
    if (barcodeData.length === 0) {
        return;
    }
    
    const container = document.getElementById('barcodeContainer');
    const buttonGroup = document.getElementById('buttonGroup');
    
    container.innerHTML = `
        <div class="empty-state">
            <p>No barcodes generated yet. Enter text and click "Generate Barcode" to start.</p>
        </div>
    `;
    buttonGroup.style.display = 'none';
    barcodeCounter = 0;
    barcodeData = [];
    
    showNotification('All barcodes cleared', 'info');
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show notification/toast message
 * @param {string} message - Message to display
 * @param {string} type - Type: 'info', 'success', 'error', 'warning'
 * @param {number} duration - Duration in milliseconds
 */
function showNotification(message, type = 'info', duration = null) {
    const container = getOrCreateNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    
    const icons = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };
    
    const titles = {
        info: 'Info',
        success: 'Success',
        error: 'Error',
        warning: 'Warning'
    };
    
    notification.innerHTML = `
        <span class="notification-icon" aria-hidden="true">${icons[type] || icons.info}</span>
        <div class="notification-content">
            <div class="notification-title">${titles[type] || titles.info}</div>
            <div class="notification-message">${escapeHtml(message)}</div>
        </div>
        <button class="notification-close" aria-label="Close notification" title="Close">×</button>
    `;
    
    container.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto-remove after duration
    const autoDuration = duration !== null ? duration : 
        (type === 'error' ? CONFIG.NOTIFICATION.ERROR_DURATION : 
         type === 'success' ? CONFIG.NOTIFICATION.SUCCESS_DURATION : 
         CONFIG.NOTIFICATION.DEFAULT_DURATION);
    
    const timeoutId = setTimeout(() => {
        removeNotification(notification);
    }, autoDuration);
    
    // Close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        clearTimeout(timeoutId);
        removeNotification(notification);
    });
}

/**
 * Get or create notification container
 * @returns {HTMLElement} Notification container
 */
function getOrCreateNotificationContainer() {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Remove notification with animation
 * @param {HTMLElement} notification - Notification element
 */
function removeNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 300);
}

