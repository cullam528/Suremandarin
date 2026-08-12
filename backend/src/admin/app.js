import currentAdmin from "./app.tsx";

export default {
  ...currentAdmin,
  config: {
    ...currentAdmin.config,
    locales: ["en", "zh-Hans"],
    tutorials: false,
  },
  register(app) {
    currentAdmin.register?.(app);
  },
  bootstrap(app) {
    currentAdmin.bootstrap?.(app);
  },
};
