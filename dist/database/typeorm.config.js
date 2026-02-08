"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeOrmConfig = void 0;
const company_entity_1 = require("../company/entities/company.entity");
const lead_entity_1 = require("../leads/entities/lead.entity");
const product_entity_1 = require("../products/entities/product.entity");
const follower_entity_1 = require("../followers/entities/follower.entity");
const consumed_lead_entity_1 = require("../leads/entities/consumed-lead.entity");
const chat_entity_1 = require("../chat/entities/chat.entity");
const post_entity_1 = require("../posts/entities/post.entity");
const post_like_entity_1 = require("../posts/entities/post-like.entity");
const post_comment_entity_1 = require("../posts/entities/post-comment.entity");
const post_save_entity_1 = require("../posts/entities/post-save.entity");
const expo_push_token_entity_1 = require("../notifications/entities/expo-push-token.entity");
const notification_entity_1 = require("../notifications/entities/notification.entity");
const analytics_log_entity_1 = require("../analytics/entities/analytics-log.entity");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
exports.typeOrmConfig = {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: 5432,
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '0.00',
    database: process.env.DATABASE_NAME || 'bizzap_db',
    entities: [
        company_entity_1.Company,
        lead_entity_1.Lead,
        product_entity_1.Product,
        follower_entity_1.Follower,
        consumed_lead_entity_1.ConsumedLead,
        chat_entity_1.Chat,
        post_entity_1.Post,
        post_like_entity_1.PostLike,
        post_comment_entity_1.PostComment,
        post_save_entity_1.PostSave,
        notification_entity_1.Notification,
        expo_push_token_entity_1.ExpoPushToken,
        analytics_log_entity_1.AnalyticsLog
    ],
    synchronize: true,
    logging: false,
    ssl: {
        rejectUnauthorized: false
    },
};
//# sourceMappingURL=typeorm.config.js.map