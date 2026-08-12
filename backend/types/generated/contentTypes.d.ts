import type { Schema, Struct } from '@strapi/strapi';

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_tokens';
  info: {
    description: '';
    displayName: 'Api Token';
    name: 'Api Token';
    pluralName: 'api-tokens';
    singularName: 'api-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    adminPermissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::permission'
    >;
    adminUserOwner: Schema.Attribute.Relation<'manyToOne', 'admin::user'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    encryptedKey: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    expiresAt: Schema.Attribute.DateTime;
    kind: Schema.Attribute.Enumeration<['content-api', 'admin']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'content-api'>;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Schema.Attribute.DefaultTo<'read-only'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_token_permissions';
  info: {
    description: '';
    displayName: 'API Token Permission';
    name: 'API Token Permission';
    pluralName: 'api-token-permissions';
    singularName: 'api-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: 'admin_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'Permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    apiToken: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::permission'> &
      Schema.Attribute.Private;
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<'manyToOne', 'admin::role'>;
    subject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: 'admin_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'Role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::role'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<'oneToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<'manyToMany', 'admin::user'>;
  };
}

export interface AdminSession extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_sessions';
  info: {
    description: 'Session Manager storage';
    displayName: 'Session';
    name: 'Session';
    pluralName: 'sessions';
    singularName: 'session';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: false;
    };
  };
  attributes: {
    absoluteExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
    childId: Schema.Attribute.String & Schema.Attribute.Private;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deviceId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    expiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::session'> &
      Schema.Attribute.Private;
    metadata: Schema.Attribute.JSON & Schema.Attribute.Private;
    origin: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique;
    status: Schema.Attribute.String & Schema.Attribute.Private;
    type: Schema.Attribute.String & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_tokens';
  info: {
    description: '';
    displayName: 'Transfer Token';
    name: 'Transfer Token';
    pluralName: 'transfer-tokens';
    singularName: 'transfer-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferTokenPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    description: '';
    displayName: 'Transfer Token Permission';
    name: 'Transfer Token Permission';
    pluralName: 'transfer-token-permissions';
    singularName: 'transfer-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::transfer-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: 'admin_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'User';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    apiTokens: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
      Schema.Attribute.Private;
    blocked: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    lastname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::user'> &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordTokenExpiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Private;
    roles: Schema.Attribute.Relation<'manyToMany', 'admin::role'> &
      Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String;
  };
}

export interface ApiAnnouncementAnnouncement
  extends Struct.CollectionTypeSchema {
  collectionName: 'announcements';
  info: {
    displayName: '06 \u8FD0\u8425 \u00B7 \u516C\u544A';
    pluralName: 'announcements';
    singularName: 'announcement';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    audience: Schema.Attribute.Enumeration<
      ['all', 'registered', 'vip', 'svip']
    > &
      Schema.Attribute.DefaultTo<'all'>;
    content: Schema.Attribute.Blocks &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    endsAt: Schema.Attribute.DateTime;
    level: Schema.Attribute.Enumeration<
      ['info', 'success', 'warning', 'urgent']
    > &
      Schema.Attribute.DefaultTo<'info'>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::announcement.announcement'
    >;
    platforms: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    startsAt: Schema.Attribute.DateTime;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiAppBannerAppBanner extends Struct.CollectionTypeSchema {
  collectionName: 'app_banners';
  info: {
    displayName: '06 \u8FD0\u8425 \u00B7 \u591A\u7AEF Banner';
    pluralName: 'app-banners';
    singularName: 'app-banner';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    article: Schema.Attribute.Relation<'manyToOne', 'api::article.article'>;
    course: Schema.Attribute.Relation<'manyToOne', 'api::course.course'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    endsAt: Schema.Attribute.DateTime;
    image: Schema.Attribute.Media<'images'> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::app-banner.app-banner'
    >;
    platforms: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    sortOrder: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    startsAt: Schema.Attribute.DateTime;
    targetType: Schema.Attribute.Enumeration<
      ['url', 'course', 'article', 'membership', 'none']
    > &
      Schema.Attribute.DefaultTo<'none'>;
    targetUrl: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiAppVersionAppVersion extends Struct.CollectionTypeSchema {
  collectionName: 'app_versions';
  info: {
    displayName: '06 \u8FD0\u8425 \u00B7 \u5BA2\u6237\u7AEF\u7248\u672C';
    pluralName: 'app-versions';
    singularName: 'app-version';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currentVersion: Schema.Attribute.String & Schema.Attribute.Required;
    downloadUrl: Schema.Attribute.String;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    forceUpdate: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::app-version.app-version'
    > &
      Schema.Attribute.Private;
    minimumVersion: Schema.Attribute.String & Schema.Attribute.Required;
    platform: Schema.Attribute.Enumeration<['ios', 'android', 'miniprogram']> &
      Schema.Attribute.DefaultTo<'ios'>;
    publishedAt: Schema.Attribute.DateTime;
    releaseNotes: Schema.Attribute.Text;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiArticleCategoryArticleCategory
  extends Struct.CollectionTypeSchema {
  collectionName: 'article_categorys';
  info: {
    displayName: '01 \u5185\u5BB9 \u00B7 \u6587\u7AE0\u5206\u7C7B';
    pluralName: 'article-categories';
    singularName: 'article-category';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    articles: Schema.Attribute.Relation<'oneToMany', 'api::article.article'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::article-category.article-category'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'name'> & Schema.Attribute.Required;
    sortOrder: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiArticleArticle extends Struct.CollectionTypeSchema {
  collectionName: 'articles';
  info: {
    displayName: '01 \u5185\u5BB9 \u00B7 \u77E5\u8BC6\u6587\u7AE0';
    pluralName: 'articles';
    singularName: 'article';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    accessLevel: Schema.Attribute.Enumeration<
      ['public', 'registered', 'vip', 'svip']
    > &
      Schema.Attribute.DefaultTo<'public'>;
    authorName: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    body: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.CustomField<'global::blocknote'> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    category: Schema.Attribute.Relation<
      'manyToOne',
      'api::article-category.article-category'
    >;
    cover: Schema.Attribute.Media<'images'> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    excerpt: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    featured: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    imageAlt: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::article.article'
    >;
    publishDate: Schema.Attribute.DateTime;
    publishedAt: Schema.Attribute.DateTime;
    readingMinutes: Schema.Attribute.Integer;
    seo: Schema.Attribute.Component<'shared.seo', false> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    slug: Schema.Attribute.UID<'title'> & Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCouponCoupon extends Struct.CollectionTypeSchema {
  collectionName: 'coupons';
  info: {
    displayName: '05 \u8425\u9500 \u00B7 \u4F18\u60E0\u7801';
    pluralName: 'coupons';
    singularName: 'coupon';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    discountType: Schema.Attribute.Enumeration<['percentage', 'fixed']> &
      Schema.Attribute.DefaultTo<'percentage'>;
    discountValue: Schema.Attribute.Decimal;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    endsAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::coupon.coupon'
    > &
      Schema.Attribute.Private;
    minimumAmount: Schema.Attribute.Decimal;
    perUserLimit: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<1>;
    publishedAt: Schema.Attribute.DateTime;
    startsAt: Schema.Attribute.DateTime;
    totalUsageLimit: Schema.Attribute.Integer;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    usedCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
  };
}

export interface ApiCourseModuleCourseModule
  extends Struct.CollectionTypeSchema {
  collectionName: 'course_modules';
  info: {
    displayName: '02 \u8BFE\u7A0B \u00B7 \u8BFE\u7A0B\u7AE0\u8282';
    pluralName: 'course-modules';
    singularName: 'course-module';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    accessLevel: Schema.Attribute.Enumeration<['registered', 'vip', 'svip']> &
      Schema.Attribute.DefaultTo<'registered'>;
    course: Schema.Attribute.Relation<'manyToOne', 'api::course.course'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    lessons: Schema.Attribute.Relation<'oneToMany', 'api::lesson.lesson'>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::course-module.course-module'
    >;
    preview: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    publishedAt: Schema.Attribute.DateTime;
    sortOrder: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCourseCourse extends Struct.CollectionTypeSchema {
  collectionName: 'courses';
  info: {
    displayName: '02 \u8BFE\u7A0B \u00B7 \u8BFE\u7A0B';
    pluralName: 'courses';
    singularName: 'course';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    accessLevel: Schema.Attribute.Enumeration<
      ['public', 'registered', 'vip', 'svip']
    > &
      Schema.Attribute.DefaultTo<'public'>;
    allowStandalonePurchase: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    audience: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    category: Schema.Attribute.Enumeration<
      ['private', 'group', 'learn-travel', 'ib-tutorial', 'online', 'exclusive']
    >;
    cover: Schema.Attribute.Media<'images'> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency: Schema.Attribute.Enumeration<['USD', 'CNY', 'EUR', 'GBP']> &
      Schema.Attribute.DefaultTo<'USD'>;
    deliveryMode: Schema.Attribute.Enumeration<
      ['online', 'offline', 'hybrid', 'travel']
    >;
    description: Schema.Attribute.Blocks &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    duration: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    featured: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    highlights: Schema.Attribute.Component<'shared.feature-item', true> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    imageAlt: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    lessonHours: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    level: Schema.Attribute.Enumeration<
      [
        'all',
        'beginner',
        'intermediate',
        'advanced',
        'ib-sl',
        'ib-hl',
        'custom',
      ]
    > &
      Schema.Attribute.DefaultTo<'all'>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::course.course'>;
    modules: Schema.Attribute.Relation<
      'oneToMany',
      'api::course-module.course-module'
    >;
    publishedAt: Schema.Attribute.DateTime;
    seo: Schema.Attribute.Component<'shared.seo', false> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    slug: Schema.Attribute.UID<'title'> & Schema.Attribute.Required;
    sortOrder: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    standalonePrice: Schema.Attribute.Decimal;
    summary: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiDailyChallengeDayDailyChallengeDay
  extends Struct.CollectionTypeSchema {
  collectionName: 'daily_challenge_days';
  info: {
    displayName: '03 \u5B66\u4E60 \u00B7 Daily 7\u5929\u6311\u6218\u5185\u5BB9';
    pluralName: 'daily-challenge-days';
    singularName: 'daily-challenge-day';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    audioUrl: Schema.Attribute.String;
    category: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    dayNumber: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 7;
          min: 1;
        },
        number
      >;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    estimatedMinutes: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<5>;
    image: Schema.Attribute.Media<'images'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::daily-challenge-day.daily-challenge-day'
    > &
      Schema.Attribute.Private;
    phraseEn: Schema.Attribute.String & Schema.Attribute.Required;
    phraseZh: Schema.Attribute.String & Schema.Attribute.Required;
    promptEn: Schema.Attribute.Text;
    promptZh: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'titleEn'> & Schema.Attribute.Required;
    sortOrder: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    titleEn: Schema.Attribute.String & Schema.Attribute.Required;
    titleZh: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiDailyProgressDailyProgress
  extends Struct.CollectionTypeSchema {
  collectionName: 'daily_progresses';
  info: {
    displayName: '03 \u5B66\u4E60 \u00B7 Daily \u6253\u5361\u8FDB\u5EA6';
    pluralName: 'daily-progresses';
    singularName: 'daily-progress';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    completedAt: Schema.Attribute.DateTime & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    dayNumber: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 7;
          min: 1;
        },
        number
      >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::daily-progress.daily-progress'
    > &
      Schema.Attribute.Private;
    platform: Schema.Attribute.Enumeration<
      ['web', 'miniprogram', 'ios', 'android']
    > &
      Schema.Attribute.DefaultTo<'web'>;
    publishedAt: Schema.Attribute.DateTime;
    source: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'daily-challenge'>;
    streak: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<1>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiEnrollmentEnrollment extends Struct.CollectionTypeSchema {
  collectionName: 'enrollments';
  info: {
    displayName: '03 \u5B66\u4E60 \u00B7 \u8BFE\u7A0B\u52A0\u5165\u8BB0\u5F55';
    pluralName: 'enrollments';
    singularName: 'enrollment';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    course: Schema.Attribute.Relation<'manyToOne', 'api::course.course'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    enrolledAt: Schema.Attribute.DateTime;
    expiresAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::enrollment.enrollment'
    > &
      Schema.Attribute.Private;
    order: Schema.Attribute.Relation<'manyToOne', 'api::order.order'>;
    publishedAt: Schema.Attribute.DateTime;
    source: Schema.Attribute.Enumeration<
      ['membership', 'purchase', 'gift', 'admin']
    >;
    status: Schema.Attribute.Enumeration<
      ['active', 'completed', 'expired', 'revoked']
    > &
      Schema.Attribute.DefaultTo<'active'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiEntitlementEntitlement extends Struct.CollectionTypeSchema {
  collectionName: 'entitlements';
  info: {
    displayName: '04 \u4F1A\u5458\u4E0E\u4EA4\u6613 \u00B7 \u6743\u76CA\u8BB0\u5F55';
    pluralName: 'entitlements';
    singularName: 'entitlement';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    expiresAt: Schema.Attribute.DateTime;
    internalNotes: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::entitlement.entitlement'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    order: Schema.Attribute.Relation<'manyToOne', 'api::order.order'>;
    platforms: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    source: Schema.Attribute.Enumeration<
      ['membership', 'order', 'gift', 'admin']
    >;
    startsAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<['active', 'expired', 'revoked']> &
      Schema.Attribute.DefaultTo<'active'>;
    subscription: Schema.Attribute.Relation<
      'manyToOne',
      'api::membership-subscription.membership-subscription'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    usageLimit: Schema.Attribute.Integer;
    usedCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiFaqFaq extends Struct.CollectionTypeSchema {
  collectionName: 'faqs';
  info: {
    displayName: '01 \u5185\u5BB9 \u00B7 \u5E38\u89C1\u95EE\u9898';
    pluralName: 'faqs';
    singularName: 'faq';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    answer: Schema.Attribute.Blocks &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    audience: Schema.Attribute.Enumeration<
      ['all', 'registered', 'vip', 'svip']
    > &
      Schema.Attribute.DefaultTo<'all'>;
    category: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::faq.faq'>;
    platforms: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    question: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    sortOrder: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiGlobalSettingGlobalSetting extends Struct.SingleTypeSchema {
  collectionName: 'global_settings';
  info: {
    displayName: '07 \u8BBE\u7F6E \u00B7 \u7F51\u7AD9\u8BBE\u7F6E';
    pluralName: 'global-settings';
    singularName: 'global-setting';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    contactAgentImage: Schema.Attribute.Media<'images'>;
    contactDescription: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    contactMethods: Schema.Attribute.Component<'shared.contact-method', true> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    contactTitle: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    copyright: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    defaultLanguage: Schema.Attribute.Enumeration<['en', 'zh-CN']> &
      Schema.Attribute.DefaultTo<'en'>;
    defaultSeo: Schema.Attribute.Component<'shared.seo', false> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    favicon: Schema.Attribute.Media<'images'>;
    footerDescription: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::global-setting.global-setting'
    >;
    logo: Schema.Attribute.Media<'images'>;
    privacyUrl: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    siteName: Schema.Attribute.String & Schema.Attribute.Required;
    socialLinks: Schema.Attribute.Component<'shared.social-link', true> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    termsUrl: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    wechatQrCode: Schema.Attribute.Media<'images'>;
    whatsappQrCode: Schema.Attribute.Media<'images'>;
  };
}

export interface ApiHomePageHomePage extends Struct.SingleTypeSchema {
  collectionName: 'home_pages';
  info: {
    displayName: '01 \u5185\u5BB9 \u00B7 \u9996\u9875\u7BA1\u7406';
    pluralName: 'home-pages';
    singularName: 'home-page';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    courseSectionTitle: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    featuredArticles: Schema.Attribute.Relation<
      'oneToMany',
      'api::article.article'
    >;
    featuredCourses: Schema.Attribute.Relation<
      'oneToMany',
      'api::course.course'
    >;
    featuredTestimonials: Schema.Attribute.Relation<
      'oneToMany',
      'api::testimonial.testimonial'
    >;
    heroSlides: Schema.Attribute.Component<'shared.hero-slide', true> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    knowledgeSectionTitle: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::home-page.home-page'
    >;
    newsletterDescription: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    newsletterTitle: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    pageDescription: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    pageTitle: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    publishedAt: Schema.Attribute.DateTime;
    seo: Schema.Attribute.Component<'shared.seo', false> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    testimonialSectionTitle: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiInquiryInquiry extends Struct.CollectionTypeSchema {
  collectionName: 'inquirys';
  info: {
    displayName: '05 \u8425\u9500 \u00B7 \u54A8\u8BE2\u7EBF\u7D22';
    pluralName: 'inquiries';
    singularName: 'inquiry';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    assignee: Schema.Attribute.String;
    campaign: Schema.Attribute.String;
    courseSlug: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currentLevel: Schema.Attribute.Enumeration<
      ['beginner', 'intermediate', 'advanced', 'not-sure']
    >;
    email: Schema.Attribute.Email & Schema.Attribute.Required;
    interestedCourse: Schema.Attribute.Relation<
      'manyToOne',
      'api::course.course'
    >;
    internalNotes: Schema.Attribute.Text;
    leadSource: Schema.Attribute.String;
    learningGoal: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::inquiry.inquiry'
    > &
      Schema.Attribute.Private;
    message: Schema.Attribute.Text;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    phone: Schema.Attribute.String;
    platform: Schema.Attribute.Enumeration<
      ['web', 'miniprogram', 'ios', 'android']
    > &
      Schema.Attribute.DefaultTo<'web'>;
    preferredDate: Schema.Attribute.Date;
    preferredTime: Schema.Attribute.String;
    privacyConsent: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    publishedAt: Schema.Attribute.DateTime;
    referralCode: Schema.Attribute.String;
    sourcePage: Schema.Attribute.String;
    status: Schema.Attribute.Enumeration<
      ['new', 'contacted', 'following-up', 'converted', 'closed', 'spam']
    > &
      Schema.Attribute.DefaultTo<'new'>;
    targetCourse: Schema.Attribute.String;
    testAnswers: Schema.Attribute.JSON;
    testBreakdown: Schema.Attribute.JSON;
    testLevel: Schema.Attribute.Enumeration<
      ['beginner', 'intermediate', 'advanced', 'not-sure']
    >;
    testScore: Schema.Attribute.Integer;
    testTotal: Schema.Attribute.Integer;
    timezone: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    wechat: Schema.Attribute.String;
    weeklyStudyTime: Schema.Attribute.String;
    whatsapp: Schema.Attribute.String;
  };
}

export interface ApiLearningProgressLearningProgress
  extends Struct.CollectionTypeSchema {
  collectionName: 'learning_progresss';
  info: {
    displayName: '03 \u5B66\u4E60 \u00B7 \u5B66\u4E60\u8FDB\u5EA6';
    pluralName: 'learning-progresses';
    singularName: 'learning-progress';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    completed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    course: Schema.Attribute.Relation<'manyToOne', 'api::course.course'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    lastStudiedAt: Schema.Attribute.DateTime;
    lesson: Schema.Attribute.Relation<'manyToOne', 'api::lesson.lesson'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::learning-progress.learning-progress'
    > &
      Schema.Attribute.Private;
    module: Schema.Attribute.Relation<
      'manyToOne',
      'api::course-module.course-module'
    >;
    platform: Schema.Attribute.Enumeration<
      ['web', 'miniprogram', 'ios', 'android']
    >;
    progressPercent: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    videoPositionSeconds: Schema.Attribute.Integer &
      Schema.Attribute.DefaultTo<0>;
  };
}

export interface ApiLessonBookingLessonBooking
  extends Struct.CollectionTypeSchema {
  collectionName: 'lesson_bookings';
  info: {
    displayName: '03 \u5B66\u4E60 \u00B7 \u8001\u5E08\u9884\u7EA6';
    pluralName: 'lesson-bookings';
    singularName: 'lesson-booking';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    adminNotes: Schema.Attribute.Text;
    cancelledAt: Schema.Attribute.DateTime;
    completedAt: Schema.Attribute.DateTime;
    confirmedAt: Schema.Attribute.DateTime;
    course: Schema.Attribute.Relation<'manyToOne', 'api::course.course'> &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::lesson-booking.lesson-booking'
    > &
      Schema.Attribute.Private;
    notes: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    requestedAt: Schema.Attribute.DateTime & Schema.Attribute.Required;
    requestedEndAt: Schema.Attribute.DateTime;
    requestedStartAt: Schema.Attribute.DateTime & Schema.Attribute.Required;
    reservedCredit: Schema.Attribute.Relation<
      'manyToOne',
      'api::lesson-credit.lesson-credit'
    >;
    source: Schema.Attribute.Enumeration<
      ['web', 'miniprogram', 'ios', 'android', 'admin']
    > &
      Schema.Attribute.DefaultTo<'web'>;
    status: Schema.Attribute.Enumeration<
      ['requested', 'confirmed', 'completed', 'cancelled']
    > &
      Schema.Attribute.DefaultTo<'requested'>;
    teacherName: Schema.Attribute.String;
    teacherUser: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    timezone: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Required;
  };
}

export interface ApiLessonCreditLessonCredit
  extends Struct.CollectionTypeSchema {
  collectionName: 'lesson_credits';
  info: {
    displayName: '03 \u5B66\u4E60 \u00B7 \u8BFE\u65F6\u5956\u52B1';
    pluralName: 'lesson-credits';
    singularName: 'lesson-credit';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    expiresAt: Schema.Attribute.DateTime;
    grantedAt: Schema.Attribute.DateTime & Schema.Attribute.Required;
    hours: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<0>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::lesson-credit.lesson-credit'
    > &
      Schema.Attribute.Private;
    notes: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    source: Schema.Attribute.Enumeration<
      ['daily-challenge', 'referral', 'purchase', 'manual']
    > &
      Schema.Attribute.DefaultTo<'manual'>;
    sourceKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    status: Schema.Attribute.Enumeration<
      ['pending-review', 'available', 'reserved', 'used', 'expired', 'revoked']
    > &
      Schema.Attribute.DefaultTo<'available'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    usedAt: Schema.Attribute.DateTime;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiLessonLesson extends Struct.CollectionTypeSchema {
  collectionName: 'lessons';
  info: {
    displayName: '02 \u8BFE\u7A0B \u00B7 \u8BFE\u65F6\u5185\u5BB9';
    pluralName: 'lessons';
    singularName: 'lesson';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    accessLevel: Schema.Attribute.Enumeration<['registered', 'vip', 'svip']> &
      Schema.Attribute.DefaultTo<'registered'>;
    attachment: Schema.Attribute.Media<'files', true>;
    audio: Schema.Attribute.Media<'audios'>;
    body: Schema.Attribute.Blocks &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    durationMinutes: Schema.Attribute.Integer;
    externalUrl: Schema.Attribute.String;
    lessonType: Schema.Attribute.Enumeration<
      ['article', 'video', 'audio', 'live', 'quiz', 'download', 'external-link']
    > &
      Schema.Attribute.DefaultTo<'article'>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::lesson.lesson'>;
    module: Schema.Attribute.Relation<
      'manyToOne',
      'api::course-module.course-module'
    >;
    preview: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'title'> & Schema.Attribute.Required;
    sortOrder: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    subtitles: Schema.Attribute.Media<'files', true>;
    summary: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    video: Schema.Attribute.Media<'videos'>;
  };
}

export interface ApiMembershipPlanMembershipPlan
  extends Struct.CollectionTypeSchema {
  collectionName: 'membership_plans';
  info: {
    displayName: '04 \u4F1A\u5458\u4E0E\u4EA4\u6613 \u00B7 \u4F1A\u5458\u65B9\u6848';
    pluralName: 'membership-plans';
    singularName: 'membership-plan';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    appleProductId: Schema.Attribute.String;
    autoRenew: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    benefits: Schema.Attribute.Component<'shared.feature-item', true> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    code: Schema.Attribute.Enumeration<['vip', 'svip']>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency: Schema.Attribute.Enumeration<['USD', 'CNY', 'EUR', 'GBP']> &
      Schema.Attribute.DefaultTo<'USD'>;
    description: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    googleProductId: Schema.Attribute.String;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::membership-plan.membership-plan'
    >;
    monthlyPrice: Schema.Attribute.Decimal;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    paypalMonthlyPlanId: Schema.Attribute.String;
    paypalProductId: Schema.Attribute.String;
    paypalYearlyPlanId: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    recommended: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    sortOrder: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    trialDays: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    wechatProductId: Schema.Attribute.String;
    yearlyPrice: Schema.Attribute.Decimal;
  };
}

export interface ApiMembershipSubscriptionMembershipSubscription
  extends Struct.CollectionTypeSchema {
  collectionName: 'membership_subscriptions';
  info: {
    displayName: '04 \u4F1A\u5458\u4E0E\u4EA4\u6613 \u00B7 \u4F1A\u5458\u8BA2\u9605';
    pluralName: 'membership-subscriptions';
    singularName: 'membership-subscription';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    autoRenew: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    cancellationReason: Schema.Attribute.Text;
    cancelledAt: Schema.Attribute.DateTime;
    channel: Schema.Attribute.Enumeration<
      [
        'paypal',
        'apple',
        'google-play',
        'wechat-pay',
        'manual',
        'gift-code',
        'admin-grant',
      ]
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currentPeriodEnd: Schema.Attribute.DateTime;
    currentPeriodStart: Schema.Attribute.DateTime;
    externalSubscriptionId: Schema.Attribute.String;
    failedPaymentCount: Schema.Attribute.Integer &
      Schema.Attribute.DefaultTo<0>;
    internalNotes: Schema.Attribute.Text;
    lastFailedAt: Schema.Attribute.DateTime;
    lastPaidAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::membership-subscription.membership-subscription'
    > &
      Schema.Attribute.Private;
    nextBillingAt: Schema.Attribute.DateTime;
    order: Schema.Attribute.Relation<'manyToOne', 'api::order.order'>;
    plan: Schema.Attribute.Relation<
      'manyToOne',
      'api::membership-plan.membership-plan'
    >;
    publishedAt: Schema.Attribute.DateTime;
    startedAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      [
        'trial',
        'active',
        'past-due',
        'suspended',
        'cancelled',
        'expired',
        'refunded',
      ]
    > &
      Schema.Attribute.DefaultTo<'active'>;
    subscriptionNumber: Schema.Attribute.UID & Schema.Attribute.Required;
    trialEndsAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiNewsletterSubscriptionNewsletterSubscription
  extends Struct.CollectionTypeSchema {
  collectionName: 'newsletter_subscriptions';
  info: {
    displayName: '05 \u8425\u9500 \u00B7 \u90AE\u4EF6\u8BA2\u9605';
    pluralName: 'newsletter-subscriptions';
    singularName: 'newsletter-subscription';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    consent: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::newsletter-subscription.newsletter-subscription'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    platform: Schema.Attribute.Enumeration<
      ['web', 'miniprogram', 'ios', 'android']
    > &
      Schema.Attribute.DefaultTo<'web'>;
    publishedAt: Schema.Attribute.DateTime;
    sourcePage: Schema.Attribute.String;
    status: Schema.Attribute.Enumeration<['subscribed', 'unsubscribed']> &
      Schema.Attribute.DefaultTo<'subscribed'>;
    subscribedAt: Schema.Attribute.DateTime;
    unsubscribedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiOrderOrder extends Struct.CollectionTypeSchema {
  collectionName: 'orders';
  info: {
    displayName: '04 \u4F1A\u5458\u4E0E\u4EA4\u6613 \u00B7 \u8BA2\u5355';
    pluralName: 'orders';
    singularName: 'order';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    cancelledAt: Schema.Attribute.DateTime;
    channel: Schema.Attribute.Enumeration<
      ['paypal', 'apple', 'google-play', 'wechat-pay', 'manual']
    >;
    completedAt: Schema.Attribute.DateTime;
    couponCode: Schema.Attribute.String;
    course: Schema.Attribute.Relation<'manyToOne', 'api::course.course'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency: Schema.Attribute.Enumeration<['USD', 'CNY', 'EUR', 'GBP']> &
      Schema.Attribute.DefaultTo<'USD'>;
    discountAmount: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    externalOrderId: Schema.Attribute.String;
    internalNotes: Schema.Attribute.Text;
    invoiceInfo: Schema.Attribute.JSON;
    lessonHours: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::order.order'> &
      Schema.Attribute.Private;
    membershipPlan: Schema.Attribute.Relation<
      'manyToOne',
      'api::membership-plan.membership-plan'
    >;
    orderNumber: Schema.Attribute.UID & Schema.Attribute.Required;
    orderStatus: Schema.Attribute.Enumeration<
      [
        'pending',
        'awaiting-payment',
        'paid',
        'completed',
        'cancelled',
        'refunding',
        'refunded',
        'failed',
        'expired',
        'disputed',
      ]
    > &
      Schema.Attribute.DefaultTo<'pending'>;
    originalAmount: Schema.Attribute.Decimal;
    paidAmount: Schema.Attribute.Decimal;
    paidAt: Schema.Attribute.DateTime;
    paymentStatus: Schema.Attribute.Enumeration<
      [
        'unpaid',
        'authorized',
        'paid',
        'partially-refunded',
        'refunded',
        'failed',
      ]
    > &
      Schema.Attribute.DefaultTo<'unpaid'>;
    platform: Schema.Attribute.Enumeration<
      ['web', 'miniprogram', 'ios', 'android', 'admin']
    > &
      Schema.Attribute.DefaultTo<'web'>;
    productNameSnapshot: Schema.Attribute.String & Schema.Attribute.Required;
    productType: Schema.Attribute.Enumeration<
      ['membership', 'course', 'event', 'other']
    >;
    publishedAt: Schema.Attribute.DateTime;
    quantity: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<1>;
    transactions: Schema.Attribute.Relation<
      'oneToMany',
      'api::payment-transaction.payment-transaction'
    >;
    unitPrice: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiPaymentTransactionPaymentTransaction
  extends Struct.CollectionTypeSchema {
  collectionName: 'payment_transactions';
  info: {
    displayName: '99 \u7CFB\u7EDF\u5185\u90E8 \u00B7 \u652F\u4ED8\u6D41\u6C34';
    pluralName: 'payment-transactions';
    singularName: 'payment-transaction';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    action: Schema.Attribute.Enumeration<
      ['authorize', 'capture', 'sale', 'refund']
    >;
    channel: Schema.Attribute.Enumeration<
      ['paypal', 'apple', 'google-play', 'wechat-pay', 'manual']
    >;
    completedAt: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency: Schema.Attribute.Enumeration<['USD', 'CNY', 'EUR', 'GBP']> &
      Schema.Attribute.DefaultTo<'USD'>;
    externalTransactionId: Schema.Attribute.String;
    failureCode: Schema.Attribute.String;
    failureReason: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::payment-transaction.payment-transaction'
    > &
      Schema.Attribute.Private;
    order: Schema.Attribute.Relation<'manyToOne', 'api::order.order'>;
    publishedAt: Schema.Attribute.DateTime;
    requestedAmount: Schema.Attribute.Decimal;
    responseSummary: Schema.Attribute.JSON;
    settledAmount: Schema.Attribute.Decimal;
    status: Schema.Attribute.Enumeration<
      ['pending', 'succeeded', 'failed', 'reversed']
    > &
      Schema.Attribute.DefaultTo<'pending'>;
    transactionNumber: Schema.Attribute.UID & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiPromotionPromotion extends Struct.CollectionTypeSchema {
  collectionName: 'promotions';
  info: {
    displayName: '05 \u8425\u9500 \u00B7 \u4F18\u60E0\u6D3B\u52A8';
    pluralName: 'promotions';
    singularName: 'promotion';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    courses: Schema.Attribute.Relation<'oneToMany', 'api::course.course'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    discountType: Schema.Attribute.Enumeration<['percentage', 'fixed']> &
      Schema.Attribute.DefaultTo<'percentage'>;
    discountValue: Schema.Attribute.Decimal;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    endsAt: Schema.Attribute.DateTime;
    image: Schema.Attribute.Media<'images'> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::promotion.promotion'
    >;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    plans: Schema.Attribute.Relation<
      'oneToMany',
      'api::membership-plan.membership-plan'
    >;
    publishedAt: Schema.Attribute.DateTime;
    startsAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    usageLimit: Schema.Attribute.Integer;
  };
}

export interface ApiReferralReferral extends Struct.CollectionTypeSchema {
  collectionName: 'referrals';
  info: {
    displayName: '06 \u8425\u9500 \u00B7 \u63A8\u8350\u8BB0\u5F55';
    pluralName: 'referrals';
    singularName: 'referral';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    course: Schema.Attribute.Relation<'manyToOne', 'api::course.course'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    enrolledAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::referral.referral'
    > &
      Schema.Attribute.Private;
    notes: Schema.Attribute.Text;
    order: Schema.Attribute.Relation<'manyToOne', 'api::order.order'>;
    publishedAt: Schema.Attribute.DateTime;
    qualifiedAt: Schema.Attribute.DateTime;
    referralCode: Schema.Attribute.String & Schema.Attribute.Required;
    referredUser: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    referrer: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    refundWindowEndsAt: Schema.Attribute.DateTime;
    registeredAt: Schema.Attribute.DateTime;
    rewardAmount: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    rewardBatchKey: Schema.Attribute.String;
    rewardCurrency: Schema.Attribute.Enumeration<['USD', 'CNY', 'EUR', 'GBP']> &
      Schema.Attribute.DefaultTo<'USD'>;
    rewardHours: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    rewardStatus: Schema.Attribute.Enumeration<
      ['pending', 'approved', 'paid', 'rejected']
    > &
      Schema.Attribute.DefaultTo<'pending'>;
    sourceChannel: Schema.Attribute.Enumeration<
      [
        'website',
        'whatsapp',
        'facebook',
        'email',
        'miniprogram',
        'ios',
        'android',
        'other',
      ]
    > &
      Schema.Attribute.DefaultTo<'website'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiRefundRefund extends Struct.CollectionTypeSchema {
  collectionName: 'refunds';
  info: {
    displayName: '99 \u7CFB\u7EDF\u5185\u90E8 \u00B7 \u9000\u6B3E\u7BA1\u7406';
    pluralName: 'refunds';
    singularName: 'refund';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    amount: Schema.Attribute.Decimal & Schema.Attribute.Required;
    approvedBy: Schema.Attribute.String;
    channel: Schema.Attribute.Enumeration<
      ['paypal', 'apple', 'google-play', 'wechat-pay', 'manual']
    >;
    completedAt: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency: Schema.Attribute.Enumeration<['USD', 'CNY', 'EUR', 'GBP']> &
      Schema.Attribute.DefaultTo<'USD'>;
    externalRefundId: Schema.Attribute.String;
    failureReason: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::refund.refund'
    > &
      Schema.Attribute.Private;
    order: Schema.Attribute.Relation<'manyToOne', 'api::order.order'>;
    publishedAt: Schema.Attribute.DateTime;
    reason: Schema.Attribute.Text;
    refundNumber: Schema.Attribute.UID & Schema.Attribute.Required;
    refundType: Schema.Attribute.Enumeration<['full', 'partial']> &
      Schema.Attribute.DefaultTo<'full'>;
    requestedBy: Schema.Attribute.String;
    revokeEntitlements: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    status: Schema.Attribute.Enumeration<
      ['requested', 'approved', 'processing', 'completed', 'failed', 'rejected']
    > &
      Schema.Attribute.DefaultTo<'requested'>;
    transaction: Schema.Attribute.Relation<
      'manyToOne',
      'api::payment-transaction.payment-transaction'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiStaticPageStaticPage extends Struct.CollectionTypeSchema {
  collectionName: 'static_pages';
  info: {
    displayName: '01 \u5185\u5BB9 \u00B7 \u56FA\u5B9A\u9875\u9762';
    pluralName: 'static-pages';
    singularName: 'static-page';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    body: Schema.Attribute.Blocks &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::static-page.static-page'
    >;
    pageType: Schema.Attribute.Enumeration<
      [
        'about',
        'privacy',
        'terms',
        'refund',
        'membership-agreement',
        'payment-policy',
        'cookie',
        'contact',
        'other',
      ]
    >;
    publishedAt: Schema.Attribute.DateTime;
    seo: Schema.Attribute.Component<'shared.seo', false> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    slug: Schema.Attribute.UID<'title'> & Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiTestimonialTestimonial extends Struct.CollectionTypeSchema {
  collectionName: 'testimonials';
  info: {
    displayName: '01 \u5185\u5BB9 \u00B7 \u5B66\u5458\u8BC4\u4EF7';
    pluralName: 'testimonials';
    singularName: 'testimonial';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    avatar: Schema.Attribute.Media<'images'>;
    country: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    course: Schema.Attribute.Relation<'manyToOne', 'api::course.course'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    duration: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    featured: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    goal: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    levelBefore: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::testimonial.testimonial'
    >;
    publishedAt: Schema.Attribute.DateTime;
    quote: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    rating: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<5>;
    result: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    sortOrder: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    studentName: Schema.Attribute.String & Schema.Attribute.Required;
    studentType: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    verified: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    videoUrl: Schema.Attribute.String;
  };
}

export interface ApiWebhookEventWebhookEvent
  extends Struct.CollectionTypeSchema {
  collectionName: 'webhook_events';
  info: {
    displayName: '99 \u7CFB\u7EDF\u5185\u90E8 \u00B7 Webhook \u65E5\u5FD7';
    pluralName: 'webhook-events';
    singularName: 'webhook-event';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    errorMessage: Schema.Attribute.Text;
    eventType: Schema.Attribute.String & Schema.Attribute.Required;
    externalEventId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::webhook-event.webhook-event'
    > &
      Schema.Attribute.Private;
    order: Schema.Attribute.Relation<'manyToOne', 'api::order.order'>;
    payload: Schema.Attribute.JSON & Schema.Attribute.Private;
    processed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    processingAttempts: Schema.Attribute.Integer &
      Schema.Attribute.DefaultTo<0>;
    provider: Schema.Attribute.Enumeration<
      ['paypal', 'apple', 'google-play', 'wechat-pay']
    >;
    publishedAt: Schema.Attribute.DateTime;
    receivedAt: Schema.Attribute.DateTime;
    signatureValid: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    subscription: Schema.Attribute.Relation<
      'manyToOne',
      'api::membership-subscription.membership-subscription'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesRelease
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_releases';
  info: {
    displayName: 'Release';
    pluralName: 'releases';
    singularName: 'release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    releasedAt: Schema.Attribute.DateTime;
    scheduledAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'empty']
    > &
      Schema.Attribute.Required;
    timezone: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_release_actions';
  info: {
    displayName: 'Release Action';
    pluralName: 'release-actions';
    singularName: 'release-action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentType: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    entryDocumentId: Schema.Attribute.String;
    isEntryValid: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    release: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::content-releases.release'
    >;
    type: Schema.Attribute.Enumeration<['publish', 'unpublish']> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: 'i18n_locale';
  info: {
    collectionName: 'locales';
    description: '';
    displayName: 'Locale';
    pluralName: 'locales';
    singularName: 'locale';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::i18n.locale'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflow
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows';
  info: {
    description: '';
    displayName: 'Workflow';
    name: 'Workflow';
    pluralName: 'workflows';
    singularName: 'workflow';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentTypes: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'[]'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    stageRequiredToPublish: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::review-workflows.workflow-stage'
    >;
    stages: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflowStage
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows_stages';
  info: {
    description: '';
    displayName: 'Stages';
    name: 'Workflow Stage';
    pluralName: 'workflow-stages';
    singularName: 'workflow-stage';
  };
  options: {
    draftAndPublish: false;
    version: '1.1.0';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#4945FF'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    permissions: Schema.Attribute.Relation<'manyToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    workflow: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::review-workflows.workflow'
    >;
  };
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  info: {
    description: '';
    displayName: 'File';
    pluralName: 'files';
    singularName: 'file';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Schema.Attribute.Text;
    caption: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    ext: Schema.Attribute.String;
    focalPoint: Schema.Attribute.JSON;
    folder: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'> &
      Schema.Attribute.Private;
    folderPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    formats: Schema.Attribute.JSON;
    hash: Schema.Attribute.String & Schema.Attribute.Required;
    height: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.file'
    > &
      Schema.Attribute.Private;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    previewUrl: Schema.Attribute.Text;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    related: Schema.Attribute.Relation<'morphToMany'>;
    size: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    url: Schema.Attribute.Text & Schema.Attribute.Required;
    width: Schema.Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: 'upload_folders';
  info: {
    displayName: 'Folder';
    pluralName: 'folders';
    singularName: 'folder';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    children: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.folder'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    files: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.file'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.folder'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    parent: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'>;
    path: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    pathId: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.role'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.String & Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginUsersPermissionsUser
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'user';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    autoRenew: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    avatar: Schema.Attribute.Media<'images'>;
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    confirmationToken: Schema.Attribute.String & Schema.Attribute.Private;
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    country: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currentPlan: Schema.Attribute.Relation<
      'manyToOne',
      'api::membership-plan.membership-plan'
    >;
    displayName: Schema.Attribute.String;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    fullName: Schema.Attribute.String;
    lastLoginAt: Schema.Attribute.DateTime;
    lastPaymentAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Private;
    marketingConsent: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    membershipChannel: Schema.Attribute.Enumeration<
      [
        'none',
        'paypal',
        'apple',
        'google-play',
        'wechat-pay',
        'manual',
        'gift-code',
        'admin-grant',
      ]
    > &
      Schema.Attribute.DefaultTo<'none'>;
    membershipExpiresAt: Schema.Attribute.DateTime;
    membershipLevel: Schema.Attribute.Enumeration<
      ['registered', 'vip', 'svip']
    > &
      Schema.Attribute.DefaultTo<'registered'>;
    membershipStartedAt: Schema.Attribute.DateTime;
    membershipStatus: Schema.Attribute.Enumeration<
      [
        'free',
        'trial',
        'active',
        'past-due',
        'suspended',
        'cancelled',
        'expired',
        'refunded',
      ]
    > &
      Schema.Attribute.DefaultTo<'free'>;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    phone: Schema.Attribute.String;
    preferredLanguage: Schema.Attribute.Enumeration<['en', 'zh-CN']> &
      Schema.Attribute.DefaultTo<'en'>;
    privacyConsentAt: Schema.Attribute.DateTime;
    privacyPolicyVersion: Schema.Attribute.String;
    provider: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    referralCode: Schema.Attribute.String & Schema.Attribute.Unique;
    referralCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    referralRewardBalance: Schema.Attribute.Decimal &
      Schema.Attribute.DefaultTo<0>;
    referredByCode: Schema.Attribute.String;
    registrationPlatform: Schema.Attribute.Enumeration<
      ['web', 'miniprogram', 'ios', 'android', 'admin']
    > &
      Schema.Attribute.DefaultTo<'web'>;
    registrationSource: Schema.Attribute.String;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    timezone: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ContentTypeSchemas {
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::permission': AdminPermission;
      'admin::role': AdminRole;
      'admin::session': AdminSession;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'admin::user': AdminUser;
      'api::announcement.announcement': ApiAnnouncementAnnouncement;
      'api::app-banner.app-banner': ApiAppBannerAppBanner;
      'api::app-version.app-version': ApiAppVersionAppVersion;
      'api::article-category.article-category': ApiArticleCategoryArticleCategory;
      'api::article.article': ApiArticleArticle;
      'api::coupon.coupon': ApiCouponCoupon;
      'api::course-module.course-module': ApiCourseModuleCourseModule;
      'api::course.course': ApiCourseCourse;
      'api::daily-challenge-day.daily-challenge-day': ApiDailyChallengeDayDailyChallengeDay;
      'api::daily-progress.daily-progress': ApiDailyProgressDailyProgress;
      'api::enrollment.enrollment': ApiEnrollmentEnrollment;
      'api::entitlement.entitlement': ApiEntitlementEntitlement;
      'api::faq.faq': ApiFaqFaq;
      'api::global-setting.global-setting': ApiGlobalSettingGlobalSetting;
      'api::home-page.home-page': ApiHomePageHomePage;
      'api::inquiry.inquiry': ApiInquiryInquiry;
      'api::learning-progress.learning-progress': ApiLearningProgressLearningProgress;
      'api::lesson-booking.lesson-booking': ApiLessonBookingLessonBooking;
      'api::lesson-credit.lesson-credit': ApiLessonCreditLessonCredit;
      'api::lesson.lesson': ApiLessonLesson;
      'api::membership-plan.membership-plan': ApiMembershipPlanMembershipPlan;
      'api::membership-subscription.membership-subscription': ApiMembershipSubscriptionMembershipSubscription;
      'api::newsletter-subscription.newsletter-subscription': ApiNewsletterSubscriptionNewsletterSubscription;
      'api::order.order': ApiOrderOrder;
      'api::payment-transaction.payment-transaction': ApiPaymentTransactionPaymentTransaction;
      'api::promotion.promotion': ApiPromotionPromotion;
      'api::referral.referral': ApiReferralReferral;
      'api::refund.refund': ApiRefundRefund;
      'api::static-page.static-page': ApiStaticPageStaticPage;
      'api::testimonial.testimonial': ApiTestimonialTestimonial;
      'api::webhook-event.webhook-event': ApiWebhookEventWebhookEvent;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::review-workflows.workflow': PluginReviewWorkflowsWorkflow;
      'plugin::review-workflows.workflow-stage': PluginReviewWorkflowsWorkflowStage;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
    }
  }
}
