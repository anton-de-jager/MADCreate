"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const library_1 = require("@prisma/client/runtime/library");
const multer_1 = require("multer");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    nodeEnv;
    logger = new common_1.Logger(AllExceptionsFilter_1.name);
    constructor(nodeEnv) {
        this.nodeEnv = nodeEnv;
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();
        const req = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let code = 'INTERNAL_ERROR';
        let message = 'Internal server error';
        let details = undefined;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const r = exception.getResponse();
            if (typeof r === 'string') {
                message = r;
            }
            else if (r && typeof r === 'object') {
                const obj = r;
                message = obj.message ?? exception.message;
                code = obj.code ?? exception.name?.replace(/Exception$/, '').toUpperCase() ?? code;
                details = obj.details;
            }
        }
        else if (exception instanceof multer_1.MulterError) {
            if (exception.code === 'LIMIT_FILE_SIZE') {
                status = common_1.HttpStatus.PAYLOAD_TOO_LARGE;
                code = 'PAYLOAD_TOO_LARGE';
                message = 'File size exceeds 10 MB limit';
            }
            else {
                status = common_1.HttpStatus.BAD_REQUEST;
                code = 'MULTER_ERROR';
                message = exception.message;
            }
        }
        else if (exception instanceof library_1.PrismaClientKnownRequestError) {
            status = common_1.HttpStatus.BAD_REQUEST;
            code = `PRISMA_${exception.code}`;
            const meta = exception.meta;
            const targets = (meta?.target ?? []);
            const targetList = Array.isArray(targets) ? targets : (targets ? [targets] : []);
            switch (exception.code) {
                case 'P2002':
                    status = common_1.HttpStatus.CONFLICT;
                    code = 'UNIQUE_VIOLATION';
                    message = targetList.length
                        ? `A record with this ${targetList.join(' + ')} already exists.`
                        : 'Duplicate record.';
                    break;
                case 'P2025':
                    status = common_1.HttpStatus.NOT_FOUND;
                    code = 'NOT_FOUND';
                    message = 'Resource not found.';
                    break;
                case 'P2003':
                    status = common_1.HttpStatus.BAD_REQUEST;
                    code = 'FOREIGN_KEY_VIOLATION';
                    message = 'Referenced resource does not exist.';
                    break;
                case 'P2000':
                    message = 'A field value was too long.';
                    break;
                case 'P2014':
                    message = 'Action would break a required relation.';
                    break;
                default:
                    message = 'Database request failed.';
            }
        }
        else if (exception instanceof Error) {
            if (this.nodeEnv === 'production') {
                message = 'Internal server error';
            }
            else {
                message = exception.message;
            }
        }
        if (status >= 500) {
            this.logger.error({ err: exception, path: req.url, method: req.method }, message);
        }
        res.status(status).json({
            ok: false,
            error: { code, message, details, path: req.url, timestamp: new Date().toISOString() },
        });
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)(),
    __metadata("design:paramtypes", [String])
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map