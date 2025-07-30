/**
 * @file This file contains the logic for converting HTML to Figma nodes.
 */

let nodeId = 1;

/**
 * Parses a CSS color string.
 * @param {string} color The CSS color string.
 * @returns {{r: number, g: number, b: number, a: number}|null} The RGBA color object, or null if parsing fails.
 */
function parseColor(color) {
  if (!color || color === 'none') return null;
  try {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      return {
        r: parseInt(match[1]) / 255,
        g: parseInt(match[2]) / 255,
        b: parseInt(match[3]) / 255,
        a: match[4] ? parseFloat(match[4]) : 1,
      };
    }
  } catch (e) {
    console.error(`Failed to parse color: ${color}`, e);
  }
  return null;
}

/**
 * Maps an HTML node to a Figma scenegraph node.
 * @param {Node} node The HTML node to convert.
 * @param {string|null} parentId The ID of the parent node.
 * @returns {Array<object>} An array of Figma nodes.
 */
function htmlToFigmaNodes(node, parentId = null) {
  let nodes = [];
  try {
    if (node.nodeType !== 1 && node.nodeType !== 3) return nodes;

    const id = (nodeId++).toString();

    if (node.nodeType === 3) { // Text node
      const textContent = node.nodeValue.trim();
      if (textContent) {
        const parentStyle = node.parentElement ? node.parentElement.ownerDocument.defaultView.getComputedStyle(node.parentElement) : {};
        const color = parseColor(parentStyle.color);
        nodes.push({
          id,
          type: "TEXT",
          name: textContent,
          parent: parentId,
          characters: textContent,
          fontSize: parseFloat(parentStyle.fontSize) || 16,
          fills: color ? [{ type: 'SOLID', color }] : [],
        });
      }
      return nodes;
    }

    const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
    const tagName = node.tagName.toLowerCase();
    const rect = node.getBoundingClientRect();

    let figmaNode = {
      id,
      parent: parentId,
      name: tagName,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      fills: [],
      strokes: [],
      effects: [],
    };

    const backgroundColor = parseColor(computedStyle.backgroundColor);
    if (backgroundColor && backgroundColor.a > 0) {
      figmaNode.fills.push({ type: 'SOLID', color: backgroundColor });
    }

    const borderColor = parseColor(computedStyle.borderColor);
    if (borderColor && borderColor.a > 0 && computedStyle.borderWidth && parseFloat(computedStyle.borderWidth) > 0) {
      figmaNode.strokes.push({ type: 'SOLID', color: borderColor });
      figmaNode.strokeWeight = parseFloat(computedStyle.borderWidth);
    }

    const borderRadius = parseFloat(computedStyle.borderRadius);
    if (borderRadius > 0) {
      figmaNode.cornerRadius = borderRadius;
    }

    if (computedStyle.boxShadow && computedStyle.boxShadow !== 'none') {
      const shadowParts = computedStyle.boxShadow.split(' ');
      const color = parseColor(shadowParts[0]);
      if (color) {
        figmaNode.effects.push({
          type: 'DROP_SHADOW',
          color,
          offset: { x: parseFloat(shadowParts[1]), y: parseFloat(shadowParts[2]) },
          radius: parseFloat(shadowParts[3]),
          visible: true,
          blendMode: 'NORMAL',
        });
      }
    }

    switch (tagName) {
      case 'svg':
        figmaNode.type = 'VECTOR';
        break;
      case 'img':
        figmaNode.type = 'RECTANGLE';
        break;
      case 'a':
      case 'button':
      case 'div':
      case 'p':
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
      case 'li':
      case 'span':
      case 'ul':
      case 'ol':
      case 'section':
      case 'header':
      case 'footer':
      case 'main':
      case 'nav':
      case 'aside':
        figmaNode.type = 'FRAME';
        figmaNode.layoutMode = 'NONE';
        figmaNode.clipsContent = computedStyle.overflow !== 'visible';
        figmaNode.paddingLeft = parseFloat(computedStyle.paddingLeft);
        figmaNode.paddingRight = parseFloat(computedStyle.paddingRight);
        figmaNode.paddingTop = parseFloat(computedStyle.paddingTop);
        figmaNode.paddingBottom = parseFloat(computedStyle.paddingBottom);
        figmaNode.itemSpacing = parseFloat(computedStyle.gap) || 0;
        break;
      default:
        figmaNode.type = 'FRAME';
        break;
    }

    nodes.push(figmaNode);

    Array.from(node.childNodes).forEach(child => {
      nodes = nodes.concat(htmlToFigmaNodes(child, id));
    });
  } catch (e) {
    console.error(`Failed to process node: ${node.nodeName}`, e);
  }
  return nodes;
}

/**
 * Builds the Figma clipboard data.
 * @param {Array<object>} nodes An array of Figma nodes.
 * @returns {string} The Figma clipboard data.
 */
function buildFigmaClipboard(nodes) {
  const metadata = {
    version: "0.1.0",
    nodes
  };
  const encoded = Buffer.from(JSON.stringify(metadata)).toString('base64');
  return `
<meta charset='utf-8'>
<span data-metadata="${encoded}"></span>
  `.trim();
}

module.exports = {
  htmlToFigmaNodes,
  buildFigmaClipboard
};
