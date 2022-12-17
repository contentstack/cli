export const aggregation = (baseClass: any, ...mixins: any) => {
  const base = class _Combined extends baseClass {
    constructor(...args: any) {
      super(...args);
      mixins.forEach((mixin: any) => {
        mixin.prototype.initializer.call(this);
      });
    }
  };

  const copyProps = (target: any, source: any) => {
    let src: any = Object.getOwnPropertySymbols(source);
    Object.getOwnPropertyNames(source)
      .concat(src)
      .forEach((prop: any) => {
        if (
          prop.match(
            /^(?:constructor|prototype|arguments|caller|name|bind|call|apply|toString|length)$/
          )
        )
          return;
        src = Object.getOwnPropertyDescriptor(source, prop);
        Object.defineProperty(target, prop, src);
      });
  };

  mixins.forEach((mixin: any) => {
    copyProps(base.prototype, mixin.prototype);
    copyProps(base, mixin);
  });

  return base;
};

// This can live anywhere in your codebase:
export function applyMixins(derivedCtor: any, constructors: any[]) {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      Object.defineProperty(
        derivedCtor.prototype,
        name,
        Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
          Object.create(null)
      );
    });
  });
}
