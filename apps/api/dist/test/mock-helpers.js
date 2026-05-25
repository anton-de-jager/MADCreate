"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockPrisma = createMockPrisma;
exports.createMockConfig = createMockConfig;
exports.createMockTokenService = createMockTokenService;
exports.createMockMailService = createMockMailService;
exports.createMockTenantsService = createMockTenantsService;
exports.createMockWorkspacesService = createMockWorkspacesService;
exports.createMockQueue = createMockQueue;
function createMockPrisma() {
    const store = {};
    return new Proxy(store, {
        get(_target, prop) {
            if (typeof prop === 'symbol')
                return undefined;
            const key = prop;
            if (!(key in store)) {
                if (key.startsWith('$') || key === 'then') {
                    store[key] = jest.fn();
                }
                else {
                    const ds = {};
                    store[key] = new Proxy(ds, {
                        get(dt, method) {
                            if (typeof method === 'symbol')
                                return undefined;
                            const m = method;
                            if (!(m in dt))
                                dt[m] = jest.fn();
                            return dt[m];
                        },
                    });
                }
            }
            return store[key];
        },
    });
}
function createMockConfig() {
    return { get: jest.fn(), getOrThrow: jest.fn() };
}
function createMockTokenService() {
    return {
        generateToken: jest.fn(),
        issueTokens: jest.fn(),
        rotateRefresh: jest.fn(),
        revokeAllForUser: jest.fn(),
        hash: jest.fn(),
    };
}
function createMockMailService() {
    return {
        sendVerificationEmail: jest.fn(),
        sendPasswordResetEmail: jest.fn(),
        sendMagicLink: jest.fn(),
        sendWorkspaceInvite: jest.fn(),
    };
}
function createMockTenantsService() {
    return {
        get: jest.fn(),
        list: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        purge: jest.fn(),
        purgeAll: jest.fn(),
    };
}
function createMockWorkspacesService() {
    return {
        assertMember: jest.fn(),
        assertRole: jest.fn(),
    };
}
function createMockQueue() {
    return {
        add: jest.fn(),
        addBulk: jest.fn(),
        close: jest.fn(),
        getJob: jest.fn(),
        getJobs: jest.fn(),
        obliterate: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
    };
}
//# sourceMappingURL=mock-helpers.js.map