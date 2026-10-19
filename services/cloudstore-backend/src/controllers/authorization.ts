import { Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import * as jwt from "jsonwebtoken";
import RedisClientPromise from "@/db-internals/redis-client";

export const Authorization = async (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> & { auth: { verified: boolean, data: any } }, next: (err?: ExtendedError | undefined) => void) => {
    // Browsers can't attach custom headers to a native WebSocket handshake,
    // so extraHeaders only works over HTTP polling. Clients forcing
    // transports: ["websocket"] (no polling upgrade) send the token via the
    // "authorization" query param instead - accept either.
    const headerAuth = socket.handshake.headers['authorization'];
    const queryToken = socket.handshake.query.authorization;
    const token = headerAuth ? headerAuth.split(' ')[1] : (typeof queryToken === 'string' ? queryToken : undefined);

    if (!token?.length) return next(new Error('error, authorization header not attached.'));
    if (!socket.handshake.query.tenant_id) return next(new Error('error, tenant id was not attached.')); // TODO Unified Public API
    const tenantPublicKeyResult = await (await RedisClientPromise).get(socket.handshake.query.tenant_id.toString());
    if (!tenantPublicKeyResult) return next(new Error('error, Tenant is not registered! Kindly make sure [tenant_id, publicKey] is added to the Redis instance.'));

    const tenantPublicKey = tenantPublicKeyResult.toString().replace(/\\n/g, '\n');
    try {
        const decoded = jwt.verify(token, tenantPublicKey, {
            algorithms: ['ES256'],
        });


        socket.auth = socket?.auth || {};
        socket.auth.verified = true;
        socket.auth.data = decoded;
        if (process.env.NODE_ENV === 'development') {
            console.log('JWT verified for tenant:', socket.handshake.query.tenant_id);
        }
        return next();
    } catch (e) {
        if (process.env.NODE_ENV === 'development') {
            console.log('invalid token', e);
        }
        return next(new Error('error, Failed to verify Bearer token against tenant. '));
    }
}
export default Authorization;