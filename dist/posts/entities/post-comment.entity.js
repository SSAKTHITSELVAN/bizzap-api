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
exports.PostComment = void 0;
const typeorm_1 = require("typeorm");
const company_entity_1 = require("../../company/entities/company.entity");
const post_entity_1 = require("./post.entity");
let PostComment = class PostComment {
    id;
    companyId;
    postId;
    comment;
    isDeleted;
    createdAt;
    updatedAt;
    company;
    post;
};
exports.PostComment = PostComment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PostComment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PostComment.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PostComment.prototype, "postId", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], PostComment.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PostComment.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PostComment.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PostComment.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company),
    (0, typeorm_1.JoinColumn)({ name: 'companyId' }),
    __metadata("design:type", company_entity_1.Company)
], PostComment.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => post_entity_1.Post),
    (0, typeorm_1.JoinColumn)({ name: 'postId' }),
    __metadata("design:type", post_entity_1.Post)
], PostComment.prototype, "post", void 0);
exports.PostComment = PostComment = __decorate([
    (0, typeorm_1.Entity)('post_comments')
], PostComment);
//# sourceMappingURL=post-comment.entity.js.map