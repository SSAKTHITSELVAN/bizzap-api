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
exports.SendMessageDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const chat_entity_1 = require("../entities/chat.entity");
class SendMessageDto {
    receiverId;
    message;
    messageType;
    fileName;
}
exports.SendMessageDto = SendMessageDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'UUID of the company receiving the message',
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "receiverId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Text message content (required for text messages)',
        example: 'Hello, I saw your lead and would like to discuss it further.',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Type of message',
        enum: chat_entity_1.MessageType,
        example: chat_entity_1.MessageType.TEXT,
    }),
    (0, class_validator_1.IsEnum)(chat_entity_1.MessageType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "messageType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Original filename (for file messages)',
        example: 'document.pdf',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "fileName", void 0);
//# sourceMappingURL=send-message.dto.js.map