import * as vscode from 'vscode';
import { IDecorationStyle, IDecorationStyles } from '../types';
import { COLORS } from '../config/constants';
import { getExtensionConfig } from '../config/settings';

/**
 * Utilities for handling decoration styles
 */
export class DecorationUtils {
  private context: vscode.ExtensionContext;
  
  /**
   * Creates a new DecorationUtils instance
   * @param context The extension context
   */
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }
  
  /**
   * Creates a bookmark data URI for SVG icons
   * @param color The color for the bookmark icon
   * @returns A vscode.Uri for the SVG bookmark icon
   */
  public getBookmarkDataUri(color: string): vscode.Uri {
    // Validate color or use default
    const validColor = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$|^rgb\(\d+,\s*\d+,\s*\d+\)$/.test(color) 
      ? color 
      : COLORS.BLUE;
    
    return vscode.Uri.parse(
      "data:image/svg+xml," +
      encodeURIComponent(`<svg version="1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" enable-background="new 0 0 48 48"><path fill="${validColor}" d="M37,43l-13-6l-13,6V9c0-2.2,1.8-4,4-4h18c2.2,0,4,1.8,4,4V43z"/></svg>`)
    );
  }
  
  /**
   * Creates a decoration style from options
   * @param decoOptions Decoration options
   * @returns A decoration style object with type and options
   */
  public getDecorationStyle(decoOptions: vscode.DecorationRenderOptions): IDecorationStyle {
    return { 
      type: vscode.window.createTextEditorDecorationType(decoOptions), 
      options: decoOptions 
    };
  }
  
  /**
   * Creates the default decoration style for a color
   * @param color The color for the decoration
   * @returns A decoration style with the specified color
   */
  public getDecorationDefaultStyle(color: string): IDecorationStyle {
    return this.getDecorationStyle({
      "gutterIconPath": this.getBookmarkDataUri(color),
      "overviewRulerColor": color + "B0",
      "light": {
        "fontWeight": "bold"
      },
      "dark": {
        "color": "Chocolate"
      }
    });
  }
  
  /**
   * Loads all decoration styles from settings
   * @returns An object mapping style names to decoration styles
   */
  public loadDecorationStyles(): IDecorationStyles {
    // Set up default styles
    const styles: IDecorationStyles = {
      "default": this.getDecorationDefaultStyle(COLORS.BLUE),
      "red": this.getDecorationDefaultStyle(COLORS.RED),
      "blue": this.getDecorationDefaultStyle(COLORS.BLUE),
      "green": this.getDecorationDefaultStyle(COLORS.GREEN),
      "purple": this.getDecorationDefaultStyle(COLORS.PURPLE)
    };
    
    // Load custom styles from settings
    const customStyles = getExtensionConfig().expert.custom.styles;
    
    for (const decoId in customStyles) {
      if (!Object.prototype.hasOwnProperty.call(customStyles, decoId)) {
        continue;
      }
      
      let decoOptions = { ...customStyles[decoId] } as vscode.DecorationRenderOptions & {
        gutterIconColor?: string;
      };
      
      // Default to blue if neither an icon path nor an icon color is specified
      if (!decoOptions.gutterIconPath) {
        decoOptions.gutterIconColor = decoOptions.gutterIconColor || COLORS.BLUE;
      }
      
      // Apply icon color if provided, otherwise fix the path
      if (decoOptions.gutterIconColor) {
        decoOptions.gutterIconPath = this.getBookmarkDataUri(decoOptions.gutterIconColor);
      } else if (typeof decoOptions.gutterIconPath === 'string') {
        decoOptions.gutterIconPath = this.context.asAbsolutePath(decoOptions.gutterIconPath);
      }
      
      // Overview ruler settings
      if (decoOptions.overviewRulerColor) {
        decoOptions.overviewRulerLane = vscode.OverviewRulerLane.Full;
      }
      
      // Background color settings
      if (decoOptions.backgroundColor) {
        decoOptions.isWholeLine = true;
      }
      
      styles[decoId] = this.getDecorationStyle(decoOptions);
    }
    
    return styles;
  }
}