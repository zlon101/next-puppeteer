// prettier.config.js or .prettierrc.js
module.exports = {
  singleQuote: true,
  semi: true, //是否使用分号，默认true，使用分号
  tabWidth: 2,
  useTabs: false, //代码缩进是否用制表符tab，默认false
  printWidth: 120, //编辑器每行的长度，默认80
  quoteProps: 'as-needed', //对象属性的引号使用 as-needed 仅在需要的时候使用 consistent 有一个属性需要引号，就都需要引号 preserve 保留用户输入的情况
  jsxSingleQuote: false,
  trailingComma: 'all', //末尾逗号, none: 末尾没有逗号 | es5: es5有效的地方保留 | all: 在可能的地方都加上逗号
  bracketSpacing: false, //字面量对象括号中的空格，默认true true - Example: { foo: bar }.  false - Example: {foo: bar}.
  // 将多行 HTML（HTML、JSX、Vue、Angular）元素的 > 放在最后一行的末尾，而不是单独放在下一行（不适用于自关闭元素）。
  jsxBracketSameLine: true,
  bracketSameLine: true,

  arrowParens: 'avoid', //箭头函数中的括号always avoid
  htmlWhitespaceSensitivity: 'css',
  vueIndentScriptAndStyle: false, //是否给vue中的 <script> and <style>标签加缩进
  endOfLine: 'lf', //行末尾标识
  eslintIntegration: true, //不让prettier使用eslint的代码格式进行校验
};
