import { ensureReferralCode, normalizeReferralCode, REFERRAL_PROTECTED_FIELDS } from '../../utils/referral-registration';
import { withOAuthAttempt } from '../../utils/oauth-attempt';

const providers = new Set(['google', 'linkedin', 'twitter']);

export default (plugin: any) => {
  const userFactory = plugin.services.user;
  plugin.services.user = (context: any) => {
    const service = userFactory(context);
    const add = service.add.bind(service);
    service.add = (values: any) => context.strapi.db.transaction(() => add(values));
    return service;
  };
  const providersFactory = plugin.services.providers;
  plugin.services.providers = (context: any) => {
    // Scope the transaction to the actual insert. Provider verification and
    // existing-account login must not hold a pooled connection while awaiting
    // Google/LinkedIn/X. The original provider service still owns all auth logic.
    const database = new Proxy(context.strapi.db, {
      get(target, key) {
        if (key !== 'query') return Reflect.get(target, key, target);
        return (uid: string) => {
          const query = target.query(uid);
          if (uid !== 'plugin::users-permissions.user') return query;
          return new Proxy(query, {
            get(repository, operation) {
              if (operation === 'create') return (options: any) => target.transaction(() => repository.create(options));
              return Reflect.get(repository, operation, repository);
            },
          });
        };
      },
    });
    const scopedStrapi = new Proxy(context.strapi, {
      get(target, key) { return key === 'db' ? database : Reflect.get(target, key, target); },
    });
    return providersFactory({ ...context, strapi: scopedStrapi });
  };
  const registryFactory = plugin.services['providers-registry'];
  plugin.services['providers-registry'] = (context: any) => {
    const service = registryFactory(context);
    const run = service.run.bind(service);
    service.run = async (input: any) => {
      // Authenticate with the original provider adapter first. The provider
      // service uses this profile only when it actually creates a new user.
      const profile = { ...await run(input) };
      for (const key of REFERRAL_PROTECTED_FIELDS) delete profile[key];
      if (providers.has(input.provider) && input.query?.mode === 'register') {
        const code = normalizeReferralCode(input.query.referredByCode);
        if (code) profile.referredByCode = code;
        const sources = new Set(['website', 'whatsapp', 'facebook', 'email', 'miniprogram', 'ios', 'android', 'other']);
        if (sources.has(input.query.referralSource)) profile.referralSource = input.query.referralSource;
      }
      return profile;
    };
    return service;
  };

  // Auth is a controller factory in Strapi 5; user is a controller object.
  const authFactory = plugin.controllers.auth;
  plugin.controllers.auth = (context: any) => {
    const controller = authFactory(context);
    controller.connect = withOAuthAttempt(context.strapi, controller.connect.bind(controller));
    const register = controller.register.bind(controller);
    controller.register = (ctx: any) => {
      if (Object.prototype.hasOwnProperty.call(ctx.request.body ?? {}, 'referredByCode')) {
        ctx.request.body.referredByCode = normalizeReferralCode(ctx.request.body.referredByCode);
      }
      return register(ctx);
    };
    return controller;
  };
  for (const action of ['create', 'update']) {
    const original = plugin.controllers.user[action];
    plugin.controllers.user[action] = async (ctx: any) => {
      if (REFERRAL_PROTECTED_FIELDS.some((key) => Object.prototype.hasOwnProperty.call(ctx.request.body ?? {}, key))) {
        return ctx.badRequest('Referral and reward fields are managed by the server.');
      }
      return original(ctx);
    };
  }
  const me = plugin.controllers.user.me;
  plugin.controllers.user.me = async (ctx: any) => {
    if (ctx.state.user?.id) await ensureReferralCode(strapi, ctx.state.user.id);
    return me(ctx);
  };
  return plugin;
};
