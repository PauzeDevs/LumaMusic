const { withAppBuildGradle } = require("@expo/config-plugins");

function insertIntoBlock(source, blockName, statement, marker) {
  if (source.includes(marker)) return source;
  const match = new RegExp("\\b" + blockName + "\\s*\\{").exec(source);
  if (!match) throw new Error("LumaMusic desugaring: missing " + blockName + " block");
  const open = source.indexOf("{", match.index);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) {
      return source.slice(0, i) + "  " + statement + "\n" + source.slice(i);
    }
  }
  throw new Error("LumaMusic desugaring: unterminated " + blockName + " block");
}

module.exports = function withLumaNewPipeDesugaring(config) {
  return withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;
    if (!gradle.includes("coreLibraryDesugaringEnabled true")) {
      const match = /compileOptions\\s*\\{/.exec(gradle);
      if (match) {
        const open = gradle.indexOf("{", match.index);
        gradle = gradle.slice(0, open + 1) + "\n    coreLibraryDesugaringEnabled true" + gradle.slice(open + 1);
      } else {
        gradle = insertIntoBlock(
          gradle,
          "android",
          "compileOptions {\n    sourceCompatibility JavaVersion.VERSION_17\n    targetCompatibility JavaVersion.VERSION_17\n    coreLibraryDesugaringEnabled true\n  }",
          "coreLibraryDesugaringEnabled true"
        );
      }
    }
    gradle = insertIntoBlock(
      gradle,
      "dependencies",
      "coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs_nio:2.1.5'",
      "coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs_nio:2.1.5'"
    );
    config.modResults.contents = gradle;
    return config;
  });
};
