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
exports.GstDetailsDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class GstDetailsDto {
    gstNumber;
}
exports.GstDetailsDto = GstDetailsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'GST Number (GSTIN) - 15 character alphanumeric',
        example: '27AAPFU0939F1ZV',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(15, 15, { message: 'GST number must be exactly 15 characters' }),
    (0, class_validator_1.Matches)(/^[0-9]{2}[A-Z0-9]{13}$/, {
        message: 'Invalid GST number format. Must be 15 characters: 2 digits followed by 13 alphanumeric characters',
    }),
    __metadata("design:type", String)
], GstDetailsDto.prototype, "gstNumber", void 0);
//# sourceMappingURL=gst-details.dto.js.map