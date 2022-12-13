const path = require("path");
const nodeExternals = require("webpack-node-externals");
const CopyPlugin = require("copy-webpack-plugin");

const bundleOptimizations = {
    runtimeChunk: "single",
    splitChunks: {
        chunks: "all",
        maxInitialRequests: Infinity,
        minSize: 0,
        cacheGroups: {
            vendor: {
                test: /[\\/]node_modules[\\/]/,
                name(module) {
                    // get the name. E.g. node_modules/packageName/not/this/part.js
                    // or node_modules/packageName
                    const packageName = module.context.match(
                        /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                    )[1];

                    // npm package names are URL-safe, but some servers don't like @ symbols
                    return `npm.${packageName.replace("@", "")}`;
                },
            },
        },
    },
};

const tsLoaderRules = {
    test: /\.ts?$/,
    use: "ts-loader",
    exclude: /node_modules/,
};

const outputFormatting = {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    chunkFilename: "[name].[contenthash].js",
};

const sharedConfig = {
    entry: {
        seabot: ["./src/server.ts"],
    },
    target: "node",
    externals: [nodeExternals()],
    module: {
        rules: [tsLoaderRules],
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    output: outputFormatting,
    optimization: bundleOptimizations,
};

const package_patterns = [
    "package.json",
    "package-lock.json"
]

const prodWebpackConfig = {
    mode: "production",
    name: "prod",
    ...sharedConfig,
    plugins: [
        new CopyPlugin({
            patterns: [
                ...package_patterns,
                "src/seabotConfig.json",
            ],
        }),
    ],
};

const devWebpackConfig = {
    mode: "development",
    name: "dev",
    ...sharedConfig,
    plugins: [
        new CopyPlugin({
            // allows us to copy different config files to dist at build time
            patterns: [
                ...package_patterns,
                { from: "src/devConfig.json", to: "seabotConfig.json" }
            ],
        }),
    ],
};

module.exports = [prodWebpackConfig, devWebpackConfig];
