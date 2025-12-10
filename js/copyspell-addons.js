


jQuery(function($){



	const cfg = window.CopyspellAddonsConfig;

    function renderAddonsList() {
        // for simplicity, list a fixed catalog you control
        const catalog = [
            { id: 'premium', title: 'Premium Addon', description: 'Adds premium tools', price: '€49' },
            { id: 'pro-templates', title: 'Pro Templates', description: 'Template pack', price: '€29' }
        ];

        const $list = $('#copyspell-addons-list').empty();
        for (const a of catalog) {
            const $item = $('<div class="cs-addon-item"></div>');
            $item.append(`<h3>${a.title} <small>${a.price}</small></h3>`);
            $item.append(`<p>${a.description}</p>`);
            const installed = !!(window.CopyspellAddons && window.CopyspellAddons.modules && window.CopyspellAddons.modules.find(m => m.indexOf(a.id + '.js')>-1));
            const $btnInstall = $(`<button class="button">${installed ? 'Reinstall/Update' : 'Install'}</button>`);
            $btnInstall.on('click', () => installAddon(a.id));
            const $btnRemove = $(`<button class="button-link" ${installed ? '' : 'disabled'}>Remove</button>`);
            $btnRemove.on('click', () => uninstallAddon(a.id));
            $item.append($btnInstall).append(' ').append($btnRemove);
            $list.append($item);
        }
    }

    async function ajaxPost(action, data) {
        data = data || {};
        data.action = action;
        data.nonce = cfg.nonce;
        return $.post(cfg.ajax_url, data);
    }

    async function installAddon(addon) {
        const license = $('#copyspell-license-input').val().trim() || cfg.license;
        if (!license) {
            alert('Enter license key first');
            return;
        }
        const $btn = $(event.target);
        $btn.prop('disabled', true).text('Installing...');
        try {
            const resp = await ajaxPost('copyspell_install_addon', { addon, license });
            if (resp.success) {
                alert('Installed: ' + (resp.data.meta?.name || addon));
                location.reload();
            } else {
                alert('Failed: ' + JSON.stringify(resp));
            }
        } finally {
            $btn.prop('disabled', false).text('Install');
        }
    }

    async function uninstallAddon(addon) {
        if (!confirm('Remove addon?')) return;
        const resp = await ajaxPost('copyspell_uninstall_addon', { addon });
        if (resp.success) {
            alert('Removed');
            location.reload();
        } else alert('Remove failed');
    }

    $('#copyspell-validate-license').on('click', async function(){
        const license = $('#copyspell-license-input').val().trim();
        if (!license) { alert('Enter license'); return; }
        $('#copyspell-license-result').text('Validating...');
        const resp = await ajaxPost('copyspell_validate_license', { license });
        if (resp.success) {
            $('#copyspell-license-result').text('License valid');
        } else {
            $('#copyspell-license-result').text('Invalid license: ' + JSON.stringify(resp));
        }
    });

    renderAddonsList();
});


