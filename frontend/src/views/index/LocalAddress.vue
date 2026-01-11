<script setup lang="ts">
import { ref, h, computed, watch } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import { useI18n } from 'vue-i18n'
import { NPopconfirm, NButton, NSwitch } from 'naive-ui'

// @ts-ignore
import { useGlobalState } from '../../store'
import { api } from '../../api'
// @ts-ignore
import Login from '../common/Login.vue';

const { jwt, settings } = useGlobalState()
// @ts-ignore
const message = useMessage()

const { t } = useI18n({
    messages: {
        en: {
            tip: 'These addresses are stored in your browser, maybe loss if you clear the browser cache.',
            success: 'success',
            address: 'Address',
            actions: 'Actions',
            changeMailAddress: 'Change Mail Address',
            unbindMailAddress: 'Unbind Mail Address credential',
            create_or_bind: 'Create or Bind',
            bindAddressSuccess: 'Bind Address Success',
            publicAccess: 'Public Access',
            publicAccessEnabled: 'Public',
            publicAccessDisabled: 'Private',
        },
        id: {
            tip: 'Alamat ini disimpan di browser Anda dan bisa hilang jika cache browser dihapus.',
            success: 'berhasil',
            address: 'Alamat',
            actions: 'Aksi',
            changeMailAddress: 'Ganti Alamat',
            unbindMailAddress: 'Lepas Kredensial Alamat',
            create_or_bind: 'Buat atau Kaitkan',
            bindAddressSuccess: 'Berhasil mengaitkan alamat',
            publicAccess: 'Akses Publik',
            publicAccessEnabled: 'Publik',
            publicAccessDisabled: 'Private',
        }
    }
});

const tabValue = ref('address')
const localAddressCache = useLocalStorage("LocalAddressCache", []);
const publicAccessMap = ref({});
const publicAccessLoading = ref({});
const data = computed(() => {
    // @ts-ignore
    if (!localAddressCache.value.includes(jwt.value)) {
        // @ts-ignore
        localAddressCache.value.push(jwt.value)
    }
    return localAddressCache.value.map((curJwt: string) => {
        try {
            const payload = JSON.parse(
                decodeURIComponent(
                    atob(curJwt.split(".")[1]
                        .replace(/-/g, "+").replace(/_/g, "/")
                    )
                )
            );
            return {
                valid: true,
                address: payload.address,
                jwt: curJwt
            }
        } catch (e) {
            return {
                valid: false,
                address: `invalid jwt [${curJwt}]`,
                jwt: curJwt
            }
        }
    })

})

const fetchPublicAccess = async (row: { jwt: string; valid: boolean }) => {
    if (!row?.valid || !row.jwt) return;
    if (publicAccessMap.value[row.jwt] !== undefined) return;
    if (publicAccessLoading.value[row.jwt]) return;
    publicAccessLoading.value[row.jwt] = true;
    try {
        const res = await api.fetch("/api/settings", { jwt: row.jwt, loading: false });
        publicAccessMap.value[row.jwt] = !!res?.public_access;
    } catch (error) {
        publicAccessMap.value[row.jwt] = null;
    } finally {
        publicAccessLoading.value[row.jwt] = false;
    }
};

watch(data, (rows) => {
    rows.forEach((row) => fetchPublicAccess(row));
}, { immediate: true });

const updatePublicAccess = async (row: { jwt: string; valid: boolean }, enabled: boolean) => {
    if (!row?.valid || !row.jwt) return;
    try {
        await api.fetch(`/api/address_visibility`, {
            method: 'POST',
            body: JSON.stringify({
                public_access: enabled,
            }),
            jwt: row.jwt,
        });
        publicAccessMap.value[row.jwt] = enabled;
        if (row.jwt === jwt.value) {
            settings.value.public_access = enabled;
        }
        message.success(t('success'));
    } catch (error) {
        message.error((error as Error).message || "error");
    }
};

const bindAddress = async () => {
    try {
        // @ts-ignore
        if (!localAddressCache.value.includes(jwt.value)) {
            // @ts-ignore
            localAddressCache.value.push(jwt.value)
        }
        tabValue.value = 'address'
        message.success(t('bindAddressSuccess'));
    } catch (error) {
        message.error((error as Error).message || "error");
    }
}

const columns = [
    {
        title: t('address'),
        key: "address"
        ,
        width: 240,
        ellipsis: {
            tooltip: true
        },
        render(row: any) {
            return h('span', { class: 'address-cell' }, row.address)
        }
    },
    {
        title: t('publicAccess'),
        key: "public_access",
        render(row: any) {
            const accessValue = publicAccessMap.value[row.jwt];
            return h(NSwitch, {
                value: !!accessValue,
                disabled: !row.valid || accessValue === null,
                loading: !!publicAccessLoading.value[row.jwt],
                'onUpdate:value': (value: boolean) => updatePublicAccess(row, value),
            }, {
                checked: () => t('publicAccessEnabled'),
                unchecked: () => t('publicAccessDisabled'),
            })
        }
    },
    {
        title: t('actions'),
        key: 'actions',
        width: 260,
        render(row: any) {
            return h('div', { class: 'action-group' }, [
                h(NPopconfirm,
                    {
                        onPositiveClick: () => {
                            jwt.value = row.jwt
                            location.reload()
                        }
                    },
                    {
                        trigger: () => h(NButton,
                            {
                                tertiary: true,
                                type: "primary",
                            },
                            { default: () => t('changeMailAddress') }
                        ),
                        default: () => `${t('changeMailAddress')}?`
                    }
                ),
                h(NPopconfirm,
                    {
                        onPositiveClick: () => {
                            if (jwt.value === row.jwt) {
                                return;
                            }
                            localAddressCache.value = localAddressCache.value.filter(
                                (curJwt: string) => curJwt !== row.jwt
                            );
                        }
                    },
                    {
                        trigger: () => h(NButton,
                            {
                                tertiary: true,
                                disabled: jwt.value === row.jwt,
                                type: "warning",
                            },
                            { default: () => t('unbindMailAddress') }
                        ),
                        default: () => `${t('unbindMailAddress')}?`
                    }
                )
            ])
        }
    }
]
</script>

<template>
    <div>
        <n-alert type="warning" :show-icon="false" :bordered="false">
            <span class="local-address-tip">{{ t('tip') }}</span>
        </n-alert>
        <n-tabs type="segment" v-model:value="tabValue">
            <n-tab-pane name="address" :tab="t('address')">
                <div class="table-scroll">
                    <n-data-table :columns="columns" :data="data" :bordered="false" embedded />
                </div>
            </n-tab-pane>
            <n-tab-pane name="create_or_bind" :tab="t('create_or_bind')">
                <Login :bindUserAddress="bindAddress" />
            </n-tab-pane>
        </n-tabs>
    </div>
</template>

<style scoped>
.action-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

.table-scroll {
    overflow: auto;
    max-height: 60vh;
}

.n-data-table {
    min-width: 520px;
}

.local-address-tip {
    display: inline-block;
    word-break: break-word;
}

.address-cell {
    display: inline-block;
    max-width: 240px;
    width: 100%;
    white-space: normal;
    word-break: break-word;
}

@media (max-width: 720px) {
    .action-group {
        flex-direction: column;
        align-items: stretch;
    }

    .action-group :deep(.n-button),
    .action-group :deep(.n-switch) {
        width: 100%;
        justify-content: center;
    }

    .action-group :deep(.n-button__content) {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .address-cell {
        max-width: 200px;
    }

    .n-data-table {
        min-width: 560px;
    }
}
</style>
