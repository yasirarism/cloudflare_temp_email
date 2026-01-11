import { createRouter, createWebHistory } from 'vue-router'
import Index from '../views/Index.vue'
import User from '../views/User.vue'
import UserOauth2Callback from '../views/user/UserOauth2Callback.vue'
import i18n from '../i18n'
import { useGlobalState } from '../store'
import { api } from '../api'

const { jwt, publicAccessError } = useGlobalState()

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            alias: "/:lang/",
            component: Index
        },
        {
            path: '/user',
            alias: "/:lang/user",
            component: User
        },
        {
            path: '/user/oauth2/callback',
            alias: "/:lang/user/oauth2/callback",
            component: UserOauth2Callback
        },
        {
            path: '/admin',
            alias: "/:lang/admin",
            component: () => import('../views/Admin.vue')
        },
        {
            path: '/:lang/:address',
            component: Index
        },
        {
            path: '/telegram_mail',
            alias: "/:lang/telegram_mail",
            component: () => import('../views/telegram/Mail.vue')
        },
        {
            name: 'not-found',
            path: '/:pathMatch(.*)*',
            redirect: '/'
        }
    ]
});


router.beforeEach(async (to, from, next) => {
    if (to.params.lang && ['en', 'id'].includes(to.params.lang)) {
        i18n.global.locale.value = to.params.lang
    } else {
        i18n.global.locale.value = 'id'
    }
    // check if query parameter has jwt, set it to store
    if (to.query.jwt) {
        jwt.value = to.query.jwt;
        publicAccessError.value = '';
    }
    const queryEmail = typeof to.query.email === 'string' ? to.query.email : '';
    const paramAddress = typeof to.params.address === 'string' ? to.params.address : '';
    const address = queryEmail || paramAddress;
    if (!to.query.jwt && address && address.includes('@')) {
        try {
            const { jwt: publicJwt } = await api.getPublicAddressJwt(address);
            if (publicJwt) {
                jwt.value = publicJwt;
                publicAccessError.value = '';
            }
        } catch (error) {
            console.error(error);
            const errorMessage = error?.message || '';
            if (errorMessage.includes('Address is private') || errorMessage.includes('403')) {
                publicAccessError.value = jwt.value ? 'privateLoggedIn' : 'private';
            } else if (errorMessage.includes('Invalid address') || errorMessage.includes('404')) {
                publicAccessError.value = 'notFound';
            } else {
                publicAccessError.value = 'failed';
            }
        }
    } else if (!to.query.jwt && !address) {
        publicAccessError.value = '';
    }
    next()
});

export default router
