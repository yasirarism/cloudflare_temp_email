import { Context } from 'hono';

import i18n from '../i18n';

const toBase64Url = (input: Uint8Array): string => {
    let raw = '';
    input.forEach((value) => {
        raw += String.fromCharCode(value);
    });
    return btoa(raw)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
};

const generateApiKey = (): string => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return `ctem_${toBase64Url(bytes)}`;
};

const maskApiKey = (key: string): string => {
    if (key.length <= 8) {
        return `${key.slice(0, 1)}***`;
    }
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
};

export default {
    list: async (c: Context<HonoCustomType>) => {
        const msgs = i18n.getMessagesbyContext(c);
        const user = c.get('userPayload');
        const db_user_id = await c.env.DB.prepare(
            `SELECT id FROM users where id = ?`
        ).bind(user.user_id).first<number | undefined | null>('id');
        if (!db_user_id) {
            return c.text(msgs.UserNotFoundMsg, 400);
        }
        const { results } = await c.env.DB.prepare(
            `SELECT id, key_name, api_key, created_at, updated_at, last_used_at
            FROM user_api_keys WHERE user_id = ?
            ORDER BY id DESC`
        ).bind(user.user_id).all<{
            id: number;
            key_name: string;
            api_key: string;
            created_at: string;
            updated_at: string;
            last_used_at: string | null;
        }>();
        const data = (results || []).map((row) => ({
            id: row.id,
            key_name: row.key_name,
            api_key_masked: maskApiKey(row.api_key),
            created_at: row.created_at,
            updated_at: row.updated_at,
            last_used_at: row.last_used_at,
        }));
        return c.json(data);
    },
    create: async (c: Context<HonoCustomType>) => {
        const msgs = i18n.getMessagesbyContext(c);
        const user = c.get('userPayload');
        const { key_name } = await c.req.json();
        const name = (key_name || '').trim();
        if (name && name.length > 255) {
            return c.text(msgs.InvalidApiKeyNameMsg, 400);
        }
        const db_user_id = await c.env.DB.prepare(
            `SELECT id FROM users where id = ?`
        ).bind(user.user_id).first<number | undefined | null>('id');
        if (!db_user_id) {
            return c.text(msgs.UserNotFoundMsg, 400);
        }
        const api_key = generateApiKey();
        const { success } = await c.env.DB.prepare(
            `INSERT INTO user_api_keys (user_id, key_name, api_key) VALUES (?, ?, ?)`
        ).bind(user.user_id, name || `API Key ${new Date().toISOString()}`, api_key).run();
        if (!success) {
            return c.text(msgs.OperationFailedMsg, 500);
        }
        const record = await c.env.DB.prepare(
            `SELECT id, key_name, created_at FROM user_api_keys WHERE api_key = ?`
        ).bind(api_key).first<{
            id: number;
            key_name: string;
            created_at: string;
        }>();
        return c.json({
            id: record?.id,
            key_name: record?.key_name,
            created_at: record?.created_at,
            api_key,
        });
    },
    remove: async (c: Context<HonoCustomType>) => {
        const msgs = i18n.getMessagesbyContext(c);
        const user = c.get('userPayload');
        const { id } = c.req.param();
        const { success } = await c.env.DB.prepare(
            `DELETE FROM user_api_keys WHERE id = ? AND user_id = ?`
        ).bind(id, user.user_id).run();
        if (!success) {
            return c.text(msgs.OperationFailedMsg, 500);
        }
        return c.json({ success: true });
    }
};
