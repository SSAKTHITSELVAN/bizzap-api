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
exports.ExtractLeadFromTextDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class ExtractLeadFromTextDto {
    userInput;
}
exports.ExtractLeadFromTextDto = ExtractLeadFromTextDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "User's natural language description of their business requirement",
        example: 'I need cotton fabric 5000 meters for my manufacturing unit in Coimbatore, budget around 2 lakhs',
        minLength: 10,
        maxLength: 1000,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(10, { message: 'Input must be at least 10 characters long' }),
    (0, class_validator_1.MaxLength)(1000, { message: 'Input must not exceed 1000 characters' }),
    __metadata("design:type", String)
], ExtractLeadFromTextDto.prototype, "userInput", void 0);
//# sourceMappingURL=extract-lead-from-text.dto.js.map