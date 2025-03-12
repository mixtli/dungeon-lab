import { build } from 'vite';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

interface ImportMap {
  imports: Record<string, string>;
}

async function testPluginBuild() {
  console.log(chalk.blue('\n🔍 Testing plugin build process...\n'));

  try {
    // Run the build
    console.log(chalk.gray('Building project...'));
    await build({
      root: ROOT_DIR,
      logLevel: 'warn', // Reduce noise
      build: {
        // Use a temporary directory for test builds
        outDir: 'dist-test'
      }
    });

    // Read the generated index.html
    console.log(chalk.gray('\nChecking generated index.html...'));
    const html = await readFile(join(ROOT_DIR, 'dist-test/index.html'), 'utf-8');

    // Check for import map
    const importMapMatch = html.match(/<script type="importmap">(.*?)<\/script>/s);
    if (!importMapMatch) {
      throw new Error('No import map found in index.html');
    }

    const importMap = JSON.parse(importMapMatch[1]) as ImportMap;
    console.log(chalk.green('\n✓ Import map generated successfully:'));
    console.log(chalk.gray(JSON.stringify(importMap, null, 2)));

    // Check for plugin builds
    console.log(chalk.gray('\nChecking plugin builds...'));
    for (const [specifier, url] of Object.entries(importMap.imports)) {
      if (specifier.startsWith('@plugins/')) {
        const pluginPath = join(ROOT_DIR, 'dist-test', url);
        try {
          await readFile(pluginPath);
          console.log(chalk.green(`✓ Plugin built successfully: ${specifier}`));
          console.log(chalk.gray(`  Output: ${url}`));
        } catch (error) {
          throw new Error(`Failed to find built plugin at ${pluginPath}`);
        }
      }
    }

    console.log(chalk.green('\n✨ Plugin build test completed successfully!\n'));
  } catch (error) {
    console.error(chalk.red('\n❌ Plugin build test failed:'));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

testPluginBuild(); 