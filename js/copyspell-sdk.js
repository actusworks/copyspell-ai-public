import CopySpellCall 		from './shared/AI/ai-call.js';
import AIapi           		from "./shared/AI/ai-api.js";
import AIH           		from "./shared/AI/ai-helpers.js";
import SVG                  from './shared/svg.js';
import {
	modelSelectionDropdown,
} from './shared/AI/ai-settings-UI.js';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━



window.CopyspellAI = window.CopyspellAI || {};


(function(api) {
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    api.CopySpellCall = CopySpellCall;
    api.AIH = AIH;
    api.AIapi = AIapi;
    api.modelSelectionDropdown = modelSelectionDropdown;
    api.SVG = SVG;
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    


    const extensionRegistry = [];
    
    api.registerExtension = function(ext) {
        extensionRegistry.push(ext);
    };

    api.initExtensions = function(app) {
        extensionRegistry.forEach(ext => {
            console.log('Initializing CopyspellAI Extensions...', ext);
            if (typeof ext.init === 'function') {
                ext.init(app);
            }
        });
    };

    api.getExtensions = function() {
        return extensionRegistry;
    }

    api.ui = {
        slots: {
            metabox: [],
            toolbar: [],
            sidebar: [],
            modals: []
        },
        registerSlot(slotName, component) {
            if (!api.ui.slots[slotName]) return;
            api.ui.slots[slotName].push(component);
        },
        renderSlots() {
            console.log('slots', api.ui.slots);
            Object.entries(api.ui.slots).forEach(([slotName, components]) => {
                const container = document.querySelector(`[data-copyspell-slot="${slotName}"]`);
                if (container && components.length) {
                    container.innerHTML = '';
                    components.forEach(fn => container.appendChild(fn()));
                }
            });
        }
    };

    api.data = (function() {
        const store = new Map();
        const listeners = new Map();

        function notify(key, value) {
            if (listeners.has(key)) {
                listeners.get(key).forEach(cb => cb(value));
            }
        }

        return {
            set(key, value) {
                store.set(key, value);
                notify(key, value);
            },
            get(key) {
                return store.get(key);
            },
            subscribe(key, callback) {
                if (!listeners.has(key)) listeners.set(key, []);
                listeners.get(key).push(callback);
            }
        };
    })();

    api.events = {
        emit(eventName, data) {
            const event = new CustomEvent(eventName, { detail: data });
            document.dispatchEvent(event);
        },
        on(eventName, callback) {
            document.addEventListener(eventName, (e) => callback(e.detail));
        }
    };

    // Filters system - allows addons to modify data (like WordPress filters)
    api.filters = (function() {
        const filters = new Map();

        return {
            /**
             * Add a filter callback
             * @param {string} filterName - Name of the filter hook
             * @param {function} callback - Function that receives and returns modified data
             * @param {number} priority - Lower runs first (default: 10)
             */
            add(filterName, callback, priority = 10) {
                if (!filters.has(filterName)) {
                    filters.set(filterName, []);
                }
                filters.get(filterName).push({ callback, priority });
                // Sort by priority
                filters.get(filterName).sort((a, b) => a.priority - b.priority);
            },

            /**
             * Remove a filter callback
             * @param {string} filterName - Name of the filter hook
             * @param {function} callback - The callback to remove
             */
            remove(filterName, callback) {
                if (!filters.has(filterName)) return;
                const list = filters.get(filterName);
                const index = list.findIndex(f => f.callback === callback);
                if (index > -1) list.splice(index, 1);
            },

            /**
             * Apply all registered filters to the data
             * @param {string} filterName - Name of the filter hook
             * @param {*} data - Data to be filtered
             * @param {...*} args - Additional arguments passed to callbacks
             * @returns {*} - The filtered data
             */
            apply(filterName, data, ...args) {
                if (!filters.has(filterName)) return data;
                return filters.get(filterName).reduce((result, { callback }) => {
                    return callback(result, ...args);
                }, data);
            },

            /**
             * Async version - Apply all registered filters to the data
             * @param {string} filterName - Name of the filter hook
             * @param {*} data - Data to be filtered
             * @param {...*} args - Additional arguments passed to callbacks
             * @returns {Promise<*>} - The filtered data
             */
            async applyAsync(filterName, data, ...args) {
                if (!filters.has(filterName)) return data;
                let result = data;
                for (const { callback } of filters.get(filterName)) {
                    result = await callback(result, ...args);
                }
                return result;
            },

            /**
             * Check if a filter has any callbacks registered
             * @param {string} filterName - Name of the filter hook
             * @returns {boolean}
             */
            has(filterName) {
                return filters.has(filterName) && filters.get(filterName).length > 0;
            }
        };
    })();

})(window.CopyspellAI);







// ADD ON:
/*
document.addEventListener('DOMContentLoaded', function() {

    if (!window.CopyspellAI) {
        console.error('Main plugin not loaded.');
        return;
    }

    window.CopyspellAI.registerExtension({
        id: 'my-addon',

        init(app) {
            // Register a toolbar component
            window.CopyspellAI.ui.registerSlot('toolbar', () => {
                const btn = document.createElement('button');
                btn.className = 'copyspell-addon-btn';
                btn.textContent = 'My Addon';
                btn.addEventListener('click', () => {
                    window.CopyspellAI.data.set('addonEvent', 'clicked');
                });
                return btn;
            });

            // React to main plugin events
            window.CopyspellAI.data.subscribe('mainState', (value) => {
                console.log('Main updated:', value);
            });
        }
    });
});
*/


// Main Plugin Bootstrapping
/*

document.addEventListener('DOMContentLoaded', function() {
    const appInstance = {}; // Your app or state object

    window.CopyspellAI.initExtensions(appInstance);
    window.CopyspellAI.ui.renderSlots();

    // Example of sending updates to add-ons
    setTimeout(() => {
        window.CopyspellAI.data.set('mainState', { ready: true });
    }, 500);
});


*/


