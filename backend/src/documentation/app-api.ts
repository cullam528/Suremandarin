const json = (schema: Record<string, unknown>, description = 'Success') => ({
  200: {
    description,
    content: { 'application/json': { schema } },
  },
  400: { description: 'Invalid request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
  401: { description: 'Login required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
  403: { description: 'Insufficient permission or membership level', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
});

const publicContentParameters = [
  {
    name: 'locale',
    in: 'query',
    description: 'Content language.',
    schema: { type: 'string', enum: ['en', 'zh'], default: 'en' },
  },
  {
    name: 'populate',
    in: 'query',
    description: 'Relations and media to include. Example: cover,category or *.',
    schema: { type: 'string' },
  },
];

const listParameters = [
  ...publicContentParameters,
  { name: 'filters', in: 'query', description: 'Strapi filter expression, for example filters[enabled][$eq]=true.', schema: { type: 'object' } },
  { name: 'sort', in: 'query', description: 'Sort expression, for example publishDate:desc.', schema: { type: 'string' } },
  { name: 'pagination[page]', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'pagination[pageSize]', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
];

const publicList = (tag: string, summary: string, description: string) => ({
  get: {
    tags: [tag],
    summary,
    description,
    operationId: `list${tag.replace(/[^A-Za-z0-9]/g, '')}`,
    security: [],
    parameters: listParameters,
    responses: json({ $ref: '#/components/schemas/StrapiListResponse' }),
  },
});

const publicSingle = (tag: string, summary: string, description: string) => ({
  get: {
    tags: [tag],
    summary,
    description,
    operationId: `get${tag.replace(/[^A-Za-z0-9]/g, '')}`,
    security: [],
    parameters: publicContentParameters,
    responses: json({ $ref: '#/components/schemas/StrapiSingleResponse' }),
  },
});

const body = (schema: string, example?: Record<string, unknown>) => ({
  required: true,
  content: {
    'application/json': {
      schema: { $ref: `#/components/schemas/${schema}` },
      ...(example ? { example } : {}),
    },
  },
});

export const appApiDocumentation = {
  tags: [
    { name: 'Authentication', description: 'Registration, password login, password recovery, and social login.' },
    { name: 'App configuration', description: 'Homepage, global settings, banners, and supported app versions.' },
    { name: 'Courses', description: 'Course catalogue and public course detail content.' },
    { name: 'Knowledge', description: 'Articles, categories, announcements, FAQ, and static content.' },
    { name: 'Daily challenge', description: 'Seven-day speaking challenge content, progress sync, and reward state.' },
    { name: 'Account', description: 'Current member profile, membership, lesson hours, referrals, orders, and progress.' },
    { name: 'Lesson booking', description: 'Student booking lifecycle and teacher completion.' },
    { name: 'Marketing', description: 'Consultation leads, newsletter subscriptions, and student testimonials.' },
    { name: 'Payments', description: 'Authenticated PayPal order and subscription flows.' },
  ],
  paths: {
    '/auth/local/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a member',
        description: 'Creates a registered member and returns a JWT. Mobile clients should set registrationPlatform to ios, android, or miniprogram.',
        operationId: 'registerMember',
        security: [],
        requestBody: body('RegisterRequest', {
          username: 'jessica', email: 'learner@example.com', password: 'StrongPassword123',
          fullName: 'Jessica Lee', preferredLanguage: 'en', registrationPlatform: 'ios', privacyConsentAt: '2026-08-22T08:00:00.000Z',
        }),
        responses: json({ $ref: '#/components/schemas/AuthResponse' }, 'Member created'),
      },
    },
    '/auth/local': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign in with email and password',
        operationId: 'loginMember',
        security: [],
        requestBody: body('LoginRequest', { identifier: 'learner@example.com', password: 'StrongPassword123' }),
        responses: json({ $ref: '#/components/schemas/AuthResponse' }, 'Signed in'),
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Request a password reset email',
        operationId: 'forgotPassword',
        security: [],
        requestBody: body('ForgotPasswordRequest', { email: 'learner@example.com' }),
        responses: json({ type: 'object', properties: { ok: { type: 'boolean' } } }),
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Reset a password',
        operationId: 'resetPassword',
        security: [],
        requestBody: body('ResetPasswordRequest'),
        responses: json({ $ref: '#/components/schemas/AuthResponse' }),
      },
    },
    '/connect/{provider}': {
      get: {
        tags: ['Authentication'],
        summary: 'Start social login',
        description: 'Browser redirect flow for Google, Facebook, or X. The provider callback ultimately returns through the configured SureMandarin frontend callback.',
        operationId: 'startSocialLogin',
        security: [],
        parameters: [{ name: 'provider', in: 'path', required: true, schema: { type: 'string', enum: ['google', 'facebook', 'twitter'] } }],
        responses: { 302: { description: 'Redirect to the social provider' }, 400: { description: 'Provider is disabled or misconfigured' } },
      },
    },
    '/auth/{provider}/callback': {
      get: {
        tags: ['Authentication'],
        summary: 'Complete social login',
        description: 'Exchanges the provider callback code for a SureMandarin JWT. Usually called by the website callback rather than directly by the app.',
        operationId: 'completeSocialLogin',
        security: [],
        parameters: [
          { name: 'provider', in: 'path', required: true, schema: { type: 'string', enum: ['google', 'facebook', 'twitter'] } },
          { name: 'access_token', in: 'query', schema: { type: 'string' } },
        ],
        responses: json({ $ref: '#/components/schemas/AuthResponse' }),
      },
    },
    '/users/me': {
      get: {
        tags: ['Account'],
        summary: 'Get the signed-in member profile',
        operationId: 'getCurrentMember',
        responses: json({ $ref: '#/components/schemas/Member' }),
      },
    },
    '/home-page': publicSingle('App configuration', 'Get homepage configuration', 'Localized homepage text, slides, SEO, and linked media.'),
    '/global-setting': publicSingle('App configuration', 'Get global configuration', 'Logo, contact methods, social links, footer, QR codes, and site-level settings.'),
    '/app-banners': publicList('App configuration', 'List app banners', 'Banners can be filtered by platform, placement, enabled state, and active dates.'),
    '/app-versions': publicList('App configuration', 'List supported app versions', 'Used by mobile clients to check minimum versions and store update URLs.'),
    '/courses': publicList('Courses', 'List courses', 'Six course categories with localized descriptions, covers, access level, delivery mode, and purchase metadata.'),
    '/article-categories': publicList('Knowledge', 'List knowledge categories', 'News & Insights, Study Tips, Chinese Culture, and Learning Strategies.'),
    '/articles': publicList('Knowledge', 'List knowledge articles', 'Use locale, category filters, slug filters, access level, and publication sorting.'),
    '/announcements': publicList('Knowledge', 'List announcements', 'Localized notices and newsroom content.'),
    '/faqs': publicList('Knowledge', 'List frequently asked questions', 'Localized FAQ content ordered by sortOrder.'),
    '/static-pages': publicList('Knowledge', 'List managed static pages', 'CMS-managed reusable content pages.'),
    '/daily-challenge-days': publicList('Daily challenge', 'List seven-day challenge lessons', 'Request enabled lessons sorted by dayNumber. Populate image and use audioUrl for speaking practice.'),
    '/membership-plans': publicList('Account', 'List membership plans', 'VIP and SVIP features and platform product identifiers.'),
    '/testimonials': publicList('Marketing', 'List published testimonials', 'Published learner stories and ratings.'),
    '/daily-progresses/me': {
      get: {
        tags: ['Daily challenge'],
        summary: 'Get my synced challenge progress',
        operationId: 'getMyDailyProgress',
        responses: json({ $ref: '#/components/schemas/DailyProgressResponse' }),
      },
    },
    '/daily-progresses': {
      post: {
        tags: ['Daily challenge'],
        summary: 'Complete a challenge day',
        description: 'Idempotent per member and day. Completing day 7 grants the unified trial lesson reward if it has not already been issued.',
        operationId: 'completeDailyChallengeDay',
        requestBody: body('DailyProgressRequest', { data: { dayNumber: 1, completedAt: '2026-08-22T08:00:00.000Z', streak: 1, platform: 'ios' } }),
        responses: json({ $ref: '#/components/schemas/DailyProgressResponse' }),
      },
    },
    '/v1/account/overview': {
      get: {
        tags: ['Account'],
        summary: 'Get the complete member account overview',
        description: 'Returns subscriptions, orders, enrolled courses, learning progress, remaining lesson hours, bookings, and referral rewards in one request.',
        operationId: 'getAccountOverview',
        responses: json({ $ref: '#/components/schemas/AccountOverview' }),
      },
    },
    '/lesson-bookings/me': {
      get: {
        tags: ['Lesson booking'],
        summary: 'List my lesson bookings',
        operationId: 'listMyLessonBookings',
        responses: json({ type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/LessonBooking' } } } }),
      },
    },
    '/lesson-bookings': {
      post: {
        tags: ['Lesson booking'],
        summary: 'Request a lesson time',
        description: 'Creates a requested booking. A staff member confirms it before the lesson credit is reserved.',
        operationId: 'requestLessonBooking',
        requestBody: body('LessonBookingRequest', { data: { courseSlug: 'online-course', requestedStartAt: '2026-08-25T10:00:00.000Z', timezone: 'Asia/Shanghai', source: 'ios', notes: '' } }),
        responses: json({ type: 'object', properties: { data: { $ref: '#/components/schemas/LessonBooking' } } }),
      },
    },
    '/lesson-bookings/{id}/cancel': {
      post: {
        tags: ['Lesson booking'],
        summary: 'Cancel my requested or confirmed lesson',
        operationId: 'cancelMyLessonBooking',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: json({ type: 'object', properties: { data: { $ref: '#/components/schemas/LessonBooking' } } }),
      },
    },
    '/lesson-bookings/{id}/complete': {
      post: {
        tags: ['Lesson booking'],
        summary: 'Mark an assigned lesson completed',
        description: 'Teacher-only action. The booking must be confirmed; completion consumes its reserved lesson credit.',
        operationId: 'completeAssignedLesson',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: json({ type: 'object', properties: { data: { $ref: '#/components/schemas/LessonBooking' } } }),
      },
    },
    '/inquiries': {
      post: {
        tags: ['Marketing'],
        summary: 'Submit a consultation or level-test lead',
        description: 'Public lead collection endpoint shared by the website, app, Android, iOS, and mini program.',
        operationId: 'submitInquiry',
        security: [],
        requestBody: body('InquiryRequest', { data: { name: 'Patty Willis', email: 'patty@example.com', courseSlug: 'not-sure', learningGoal: 'Speak confidently', currentLevel: 'beginner', timezone: 'America/New_York', platform: 'ios', privacyConsent: true } }),
        responses: json({ $ref: '#/components/schemas/StrapiSingleResponse' }, 'Lead recorded'),
      },
    },
    '/testimonials/submit': {
      post: {
        tags: ['Marketing'],
        summary: 'Submit a testimonial',
        description: 'VIP/SVIP only. New submissions are drafts and remain hidden until staff review.',
        operationId: 'submitTestimonial',
        requestBody: body('TestimonialRequest', { quote: 'My teacher made every lesson practical and enjoyable.', country: 'United States', rating: 5 }),
        responses: json({ $ref: '#/components/schemas/StrapiSingleResponse' }, 'Testimonial awaiting review'),
      },
    },
    '/v1/payments/paypal/orders': {
      post: {
        tags: ['Payments'],
        summary: 'Create a PayPal order',
        operationId: 'createPayPalOrder',
        requestBody: body('PayPalOrderRequest'),
        responses: json({ $ref: '#/components/schemas/PayPalOrderResponse' }),
      },
    },
    '/v1/payments/paypal/capture': {
      post: {
        tags: ['Payments'],
        summary: 'Capture an approved PayPal order',
        operationId: 'capturePayPalOrder',
        requestBody: body('PayPalCaptureRequest', { paypalOrderId: 'PAYPAL_ORDER_ID' }),
        responses: json({ type: 'object', additionalProperties: true }),
      },
    },
    '/v1/payments/paypal/subscriptions': {
      post: {
        tags: ['Payments'],
        summary: 'Create a PayPal membership subscription',
        operationId: 'createPayPalSubscription',
        requestBody: body('PayPalSubscriptionRequest'),
        responses: json({ type: 'object', additionalProperties: true }),
      },
    },
  },
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          data: { nullable: true },
          error: { type: 'object', properties: { status: { type: 'integer' }, name: { type: 'string' }, message: { type: 'string' }, details: { type: 'object', additionalProperties: true } } },
        },
      },
      StrapiListResponse: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { type: 'object', additionalProperties: true } },
          meta: { type: 'object', properties: { pagination: { type: 'object', properties: { page: { type: 'integer' }, pageSize: { type: 'integer' }, pageCount: { type: 'integer' }, total: { type: 'integer' } } } } },
        },
      },
      StrapiSingleResponse: { type: 'object', properties: { data: { type: 'object', additionalProperties: true }, meta: { type: 'object', additionalProperties: true } } },
      Member: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, username: { type: 'string' }, email: { type: 'string', format: 'email' }, fullName: { type: 'string' }, displayName: { type: 'string' },
          country: { type: 'string' }, preferredLanguage: { type: 'string', enum: ['en', 'zh-CN'] }, timezone: { type: 'string' }, referralCode: { type: 'string' },
          membershipLevel: { type: 'string', enum: ['registered', 'vip', 'svip'] }, membershipStatus: { type: 'string' }, lessonHoursBalance: { type: 'number' },
        },
      },
      AuthResponse: { type: 'object', required: ['jwt', 'user'], properties: { jwt: { type: 'string' }, user: { $ref: '#/components/schemas/Member' } } },
      RegisterRequest: {
        type: 'object', required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', minLength: 3 }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 6, format: 'password' },
          fullName: { type: 'string' }, displayName: { type: 'string' }, phone: { type: 'string' }, country: { type: 'string' }, preferredLanguage: { type: 'string', enum: ['en', 'zh-CN'] },
          timezone: { type: 'string' }, registrationSource: { type: 'string' }, registrationPlatform: { type: 'string', enum: ['web', 'miniprogram', 'ios', 'android'] },
          marketingConsent: { type: 'boolean' }, privacyPolicyVersion: { type: 'string' }, privacyConsentAt: { type: 'string', format: 'date-time' },
        },
      },
      LoginRequest: { type: 'object', required: ['identifier', 'password'], properties: { identifier: { type: 'string' }, password: { type: 'string', format: 'password' } } },
      ForgotPasswordRequest: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } },
      ResetPasswordRequest: { type: 'object', required: ['code', 'password', 'passwordConfirmation'], properties: { code: { type: 'string' }, password: { type: 'string', format: 'password' }, passwordConfirmation: { type: 'string', format: 'password' } } },
      InquiryRequest: {
        type: 'object', required: ['data'],
        properties: { data: { type: 'object', required: ['name', 'email', 'courseSlug'], properties: {
          name: { type: 'string' }, email: { type: 'string', format: 'email' }, courseSlug: { type: 'string' }, currentLevel: { type: 'string', enum: ['beginner', 'intermediate', 'advanced', 'not-sure'] },
          learningGoal: { type: 'string' }, preferredTime: { type: 'string' }, phone: { type: 'string' }, targetCourse: { type: 'string' }, weeklyStudyTime: { type: 'string' },
          preferredDate: { type: 'string', format: 'date' }, message: { type: 'string' }, sourcePage: { type: 'string' }, campaign: { type: 'string' }, leadSource: { type: 'string' },
          referralCode: { type: 'string' }, timezone: { type: 'string' }, platform: { type: 'string', enum: ['web', 'miniprogram', 'ios', 'android'] }, privacyConsent: { type: 'boolean' },
          testScore: { type: 'integer' }, testTotal: { type: 'integer' }, testLevel: { type: 'string' }, testBreakdown: { type: 'object', additionalProperties: true }, testAnswers: { type: 'array', items: { type: 'object', additionalProperties: true } },
        } } },
      },
      DailyProgressRequest: { type: 'object', required: ['data'], properties: { data: { type: 'object', required: ['dayNumber'], properties: { dayNumber: { type: 'integer', minimum: 1, maximum: 7 }, completedAt: { type: 'string', format: 'date-time' }, streak: { type: 'integer', minimum: 1 }, source: { type: 'string' }, platform: { type: 'string', enum: ['web', 'miniprogram', 'ios', 'android'] } } } } },
      DailyProgressResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              completed: { type: 'array', items: { type: 'integer', minimum: 1, maximum: 7 } },
              streak: { type: 'integer' },
              lastCompletedAt: { type: 'string', format: 'date-time', nullable: true },
              reward: {
                type: 'object',
                nullable: true,
                properties: {
                  status: { type: 'string' },
                  hours: { type: 'number' },
                  grantedAt: { type: 'string', format: 'date-time', nullable: true },
                },
              },
            },
          },
          saved: { type: 'boolean' },
          recordId: { type: 'integer' },
        },
      },
      LessonBookingRequest: { type: 'object', required: ['data'], properties: { data: { type: 'object', required: ['courseSlug', 'requestedStartAt', 'timezone'], properties: { courseSlug: { type: 'string' }, requestedStartAt: { type: 'string', format: 'date-time' }, requestedEndAt: { type: 'string', format: 'date-time' }, timezone: { type: 'string' }, teacherName: { type: 'string' }, source: { type: 'string', enum: ['web', 'miniprogram', 'ios', 'android'] }, notes: { type: 'string' } } } } },
      LessonBooking: { type: 'object', properties: { id: { type: 'integer' }, status: { type: 'string', enum: ['requested', 'confirmed', 'completed', 'cancelled'] }, requestedStartAt: { type: 'string', format: 'date-time' }, requestedEndAt: { type: 'string', format: 'date-time' }, timezone: { type: 'string' }, teacherUserId: { type: 'integer', nullable: true }, teacherName: { type: 'string', nullable: true }, notes: { type: 'string' }, confirmedAt: { type: 'string', format: 'date-time', nullable: true }, completedAt: { type: 'string', format: 'date-time', nullable: true }, cancelledAt: { type: 'string', format: 'date-time', nullable: true }, course: { type: 'object', nullable: true, additionalProperties: true } } },
      TestimonialRequest: { type: 'object', required: ['quote', 'rating'], properties: { quote: { type: 'string', minLength: 10, maxLength: 1000 }, country: { type: 'string' }, rating: { type: 'integer', minimum: 1, maximum: 5 } } },
      AccountOverview: { type: 'object', properties: { subscriptions: { type: 'array', items: { type: 'object', additionalProperties: true } }, orders: { type: 'array', items: { type: 'object', additionalProperties: true } }, enrollments: { type: 'array', items: { type: 'object', additionalProperties: true } }, progress: { type: 'array', items: { type: 'object', additionalProperties: true } }, lessonCredits: { type: 'object', properties: { availableHours: { type: 'number' }, reservedHours: { type: 'number' }, bySource: { type: 'object', additionalProperties: { type: 'number' } }, credits: { type: 'array', items: { type: 'object', additionalProperties: true } } } }, lessonBookings: { type: 'array', items: { $ref: '#/components/schemas/LessonBooking' } }, referralStats: { type: 'object', properties: { invitedCount: { type: 'integer' }, registeredCount: { type: 'integer' }, enrolledCount: { type: 'integer' }, pendingRewardHours: { type: 'number' }, earnedRewardHours: { type: 'number' } } }, referrals: { type: 'array', items: { type: 'object', additionalProperties: true } } } },
      PayPalOrderRequest: { type: 'object', required: ['productType'], properties: { productType: { type: 'string', enum: ['membership', 'course'] }, planDocumentId: { type: 'string' }, courseDocumentId: { type: 'string' }, billingCycle: { type: 'string', enum: ['monthly', 'yearly'], default: 'monthly' }, platform: { type: 'string', enum: ['web', 'miniprogram', 'ios', 'android'] } } },
      PayPalOrderResponse: { type: 'object', properties: { orderNumber: { type: 'string' }, paypalOrderId: { type: 'string' }, status: { type: 'string' }, links: { type: 'array', items: { type: 'object', additionalProperties: true } } } },
      PayPalCaptureRequest: { type: 'object', required: ['paypalOrderId'], properties: { paypalOrderId: { type: 'string' } } },
      PayPalSubscriptionRequest: { type: 'object', required: ['planDocumentId'], properties: { planDocumentId: { type: 'string' }, billingCycle: { type: 'string', enum: ['monthly', 'yearly'], default: 'monthly' }, returnUrl: { type: 'string', format: 'uri' }, cancelUrl: { type: 'string', format: 'uri' } } },
    },
  },
};
