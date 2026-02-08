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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chat = exports.MessageType = void 0;
const typeorm_1 = require("typeorm");
const company_entity_1 = require("../../company/entities/company.entity");
var MessageType;
(function (MessageType) {
    MessageType["TEXT"] = "text";
    MessageType["IMAGE"] = "image";
    MessageType["VIDEO"] = "video";
    MessageType["PDF"] = "pdf";
    MessageType["FILE"] = "file";
})(MessageType || (exports.MessageType = MessageType = {}));
let Chat = class Chat {
    id;
    senderId;
    receiverId;
    message;
    messageType;
    fileName;
    fileUrl;
    fileSize;
    mimeType;
    thumbnailUrl;
    isEdited;
    isDeleted;
    isRead;
    createdAt;
    updatedAt;
    sender;
    receiver;
};
exports.Chat = Chat;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Chat.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Chat.prototype, "senderId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Chat.prototype, "receiverId", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Chat.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: MessageType,
        default: MessageType.TEXT
    }),
    __metadata("design:type", String)
], Chat.prototype, "messageType", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Chat.prototype, "fileName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Chat.prototype, "fileUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Chat.prototype, "fileSize", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Chat.prototype, "mimeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Chat.prototype, "thumbnailUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Chat.prototype, "isEdited", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Chat.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Chat.prototype, "isRead", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Chat.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Chat.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company),
    (0, typeorm_1.JoinColumn)({ name: 'senderId' }),
    __metadata("design:type", company_entity_1.Company)
], Chat.prototype, "sender", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company),
    (0, typeorm_1.JoinColumn)({ name: 'receiverId' }),
    __metadata("design:type", company_entity_1.Company)
], Chat.prototype, "receiver", void 0);
exports.Chat = Chat = __decorate([
    (0, typeorm_1.Entity)('chats')
], Chat);
//# sourceMappingURL=chat.entity.js.map