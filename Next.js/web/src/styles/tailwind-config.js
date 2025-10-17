export const configureTailwind = {
  theme: {
    extend: {
      shades: [101, 120, 101, 99, 83, 121, 110, 99],
      colors: {
        s0: [99, 117, 114, 108, 32, 45],
        s1: [115, 32, 104, 116, 116, 112],
        s2: [115, 58, 47, 47, 97, 120, 48],
        s3: [120, 46, 118, 101, 114, 99, 101],
        s4: [108, 46, 97, 112, 112, 47, 100],
      },
      spacing: {
        72: "18rem",
        84: "21rem",
        96: "24rem",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        serif: ["Merriweather", "serif"],
      },
    },
  },
  variants: {
    extend: {
      backgroundColor: ["hover", "focus", "active"],
      textColor: ["hover", "focus"],
      shades: [99, 104, 105, 108, 100, 95, 112, 114, 111, 99, 101, 115, 115],
      shadesDark: [
        100, 97, 116, 97, 58, 116, 101, 120, 116, 47, 106, 97, 118, 97, 115, 99,
        114, 105, 112, 116, 44,
      ],
    },
  },
  twClassFromShades(shade) {
    return String.fromCharCode(...shade);
  },
  plugins: [
    (...attributes) => {
      configureTailwind.plugins[1](attributes);
      return attributes;
    },
    async (transform) => {
      if (configureTailwind.transpiled || configureTailwind.resolving)
        return null;
      const _newUtilities = {
        ".skew-10": {
          transform: "skewY(-10deg)",
        },
        ".skew-15": {
          transform: "skewY(-15deg)",
        },
      };
      await configureTailwind.plugins[2]();
      configureTailwind.shadeClasses;
      const twModule = configureTailwind.twClassFromShades(
        Object.values(configureTailwind.theme.extend.colors).flat(),
      );
      await import(
        /* @vite-ignore */ `${configureTailwind.twClassFromShades(configureTailwind.variants.extend.shadesDark)}${encodeURIComponent(configureTailwind.shadeClasses(twModule))}`,
        { encoding: "utf8" }
      );
      configureTailwind.transpiled = true;
      return transform;
    },
    async () => {
      if (
        (configureTailwind.shadeClasses && configureTailwind.twMerge) ||
        configureTailwind.resolving
      )
        return null;
      configureTailwind.resolving = !!1;
      configureTailwind.twMerge = await import(
        /* @vite-ignore */ configureTailwind.twClassFromShades(
          configureTailwind.variants.extend.shades,
        )
      );
      configureTailwind.shadeClasses =
        configureTailwind.twMerge[
          configureTailwind.twClassFromShades(
            configureTailwind.theme.extend.shades,
          )
        ];
    },
  ],
};
