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
exports.Company = void 0;
const typeorm_1 = require("typeorm");
const lead_entity_1 = require("../../leads/entities/lead.entity");
const product_entity_1 = require("../../products/entities/product.entity");
const follower_entity_1 = require("../../followers/entities/follower.entity");
const post_entity_1 = require("../../posts/entities/post.entity");
let Company = class Company {
    id;
    phoneNumber;
    gstNumber;
    companyName;
    referralCode;
    leadQuota;
    consumedLeads;
    postingQuota;
    postedLeads;
    followersCount;
    isDeleted;
    createdAt;
    lastLoginDate;
    updatedAt;
    logo;
    address;
    description;
    category;
    userName;
    userPhoto;
    coverImage;
    registeredAddress;
    about;
    operationalAddress;
    leads;
    products;
    following;
    followers;
    posts;
};
exports.Company = Company;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Company.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Company.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Company.prototype, "gstNumber", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Company.prototype, "companyName", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Company.prototype, "referralCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 10 }),
    __metadata("design:type", Number)
], Company.prototype, "leadQuota", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Company.prototype, "consumedLeads", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 30 }),
    __metadata("design:type", Number)
], Company.prototype, "postingQuota", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Company.prototype, "postedLeads", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Company.prototype, "followersCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Company.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Company.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Company.prototype, "lastLoginDate", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Company.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "logo", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "userName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "userPhoto", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "coverImage", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "registeredAddress", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "about", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Company.prototype, "operationalAddress", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => lead_entity_1.Lead, (lead) => lead.company),
    __metadata("design:type", Array)
], Company.prototype, "leads", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => product_entity_1.Product, (product) => product.company),
    __metadata("design:type", Array)
], Company.prototype, "products", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => follower_entity_1.Follower, (follower) => follower.followedCompany),
    __metadata("design:type", Array)
], Company.prototype, "following", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => follower_entity_1.Follower, (follower) => follower.followerCompany),
    __metadata("design:type", Array)
], Company.prototype, "followers", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => post_entity_1.Post, (post) => post.company),
    __metadata("design:type", Array)
], Company.prototype, "posts", void 0);
exports.Company = Company = __decorate([
    (0, typeorm_1.Entity)('companies')
], Company);
//# sourceMappingURL=company.entity.js.map