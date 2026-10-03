import { collectionError, failureReason, parseConfig, pathLabel, readConfig } from '../filesystem.mjs';

export const MAX_CONFIG_FILES = 4;
export const MAX_DECLARATIONS = 128;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export async function collectMcpConfig(record, { configFiles, userHome, read = readConfig }) {
  if (!configFiles.length) {
    const check = record.check('mcp-config', 'scope', null);
    check.status = 'not-requested';
    record.unknown('MCP declarations were not inspected because no JSON configuration file was selected.');
    return;
  }
  for (const file of configFiles) {
    const check = record.check('mcp-config', 'json-config', pathLabel(file, userHome));
    try {
      const config = parseConfig(await read(file));
      if (!object(config) || !Object.hasOwn(config, 'mcpServers') || !object(config.mcpServers)) {
        throw collectionError('unsupported-config-shape');
      }
      const declarations = Object.values(config.mcpServers);
      if (declarations.length > MAX_DECLARATIONS) throw collectionError('declaration-limit');
      // Reject the selected file as a whole if a declaration is malformed;
      // never silently drop an entry and imply successful complete parsing.
      if (declarations.some(entry => !object(entry))) throw collectionError('invalid-declaration');
      check.status = 'observed';
      check.declaration_count = declarations.length;
      declarations.forEach((entry, index) => {
        record.observe(check, 'mcp-declaration', `MCP configuration declaration ${index + 1} was observed.`, {
          entry_index: index + 1,
          command_field_present: Object.hasOwn(entry, 'command'),
          url_field_present: Object.hasOwn(entry, 'url'),
          disabled: typeof entry.disabled === 'boolean' ? entry.disabled : null,
        }, 'This supports only the presence of an object in the selected JSON mcpServers map. Field presence does not establish valid configuration.',
        ['Server runtime, connection history, tool calls and effective access are not established.',
          'Declaration names and configuration values were intentionally omitted.']);
      });
    } catch (error) {
      record.fail(check, failureReason(error), 'Declarations in this selected file were not retained; their contents remain unknown.');
    }
  }
}
