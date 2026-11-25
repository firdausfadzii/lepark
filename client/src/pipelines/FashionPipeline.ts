import Phaser from "phaser";

/**
 * Fragment shader pipeline that replaces Color-ID keys on base character sheets
 * and 4-frame static fashion overlays at runtime.
 */
export default class FashionPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private _shirt: [number, number, number] = [1.0, 1.0, 1.0];
  private _sleeve: [number, number, number] = [1.0, 1.0, 1.0];
  private _forearm: [number, number, number] = [0.98, 0.95, 0.91];
  private _pants: [number, number, number] = [0.17, 0.24, 0.31];
  private _skin: [number, number, number] = [0.98, 0.95, 0.91];
  private _frontArm: [number, number, number] = [0.98, 0.95, 0.91];

  constructor(game: Phaser.Game) {
    super({
      game,
      name: "FashionPipeline",
      fragShader: `
        precision mediump float;
        uniform sampler2D uMainSampler;
        varying vec2 outTexCoord;

        uniform vec3 uShirtColor;
        uniform vec3 uSleeveColor;
        uniform vec3 uForearmColor;
        uniform vec3 uPantsColor;
        uniform vec3 uSkinColor;
        uniform vec3 uFrontArmColor;

        bool isColor(vec3 pixel, vec3 target) {
          return distance(pixel, target) < 0.05;
        }

        void main() {
          vec4 texColor = texture2D(uMainSampler, outTexCoord);

          if (texColor.a < 0.1) {
            gl_FragColor = texColor;
            return;
          }

          vec3 rgb = texColor.rgb;

          if (isColor(rgb, vec3(1.0, 0.0, 0.0))) {
            // #FF0000 -> Shirt / Outerwear Base
            rgb = uShirtColor;
          } else if (isColor(rgb, vec3(0.667, 0.0, 0.0))) {
            // #AA0000 -> Shirt / Outerwear Shadow
            rgb = uShirtColor * 0.75;
          } else if (isColor(rgb, vec3(1.0, 0.533, 0.0))) {
            // #FF8800 -> Upper Sleeves
            rgb = uSleeveColor;
          } else if (isColor(rgb, vec3(1.0, 0.733, 0.0))) {
            // #FFBB00 -> Lower Forearm Sleeves
            rgb = uForearmColor;
          } else if (isColor(rgb, vec3(0.0, 0.0, 1.0))) {
            // #0000FF -> Pants Base
            rgb = uPantsColor;
          } else if (isColor(rgb, vec3(0.0, 0.0, 0.667))) {
            // #0000AA -> Pants Shadow
            rgb = uPantsColor * 0.75;
          } else if (isColor(rgb, vec3(0.0, 1.0, 0.0))) {
            // #00FF00 -> Skin Base
            rgb = uSkinColor;
          } else if (isColor(rgb, vec3(0.0, 0.867, 0.0))) {
            // #00DD00 -> Skin Brow / Nose Tint
            rgb = uSkinColor * 0.92;
          } else if (isColor(rgb, vec3(0.0, 0.667, 0.0))) {
            // #00AA00 -> Skin Shadow (ears, neck, back hand)
            rgb = uSkinColor * 0.78;
          } else if (isColor(rgb, vec3(1.0, 1.0, 0.0))) {
            // #FFFF00 -> Front Swinging Hand
            rgb = uFrontArmColor;
          } else if (isColor(rgb, vec3(0.533, 0.533, 0.0))) {
            // #888800 -> Front Arm Crisp 1px Outline (#111111)
            rgb = vec3(0.067, 0.067, 0.067);
          }

          gl_FragColor = vec4(rgb, texColor.a);
        }
      `,
    });
  }

  private applyUniforms(): void {
    this.set3f("uShirtColor", this._shirt[0], this._shirt[1], this._shirt[2]);
    this.set3f("uSleeveColor", this._sleeve[0], this._sleeve[1], this._sleeve[2]);
    this.set3f("uForearmColor", this._forearm[0], this._forearm[1], this._forearm[2]);
    this.set3f("uPantsColor", this._pants[0], this._pants[1], this._pants[2]);
    this.set3f("uSkinColor", this._skin[0], this._skin[1], this._skin[2]);
    this.set3f("uFrontArmColor", this._frontArm[0], this._frontArm[1], this._frontArm[2]);
  }

  override onPreRender(): void {
    if (this.hasBooted) {
      this.applyUniforms();
    }
  }

  override onDraw(renderTarget: Phaser.Renderer.WebGL.RenderTarget): void {
    this.applyUniforms();
    this.bindAndDraw(renderTarget);
  }

  public setOutfit(opts: {
    shirtHex: string;
    sleeveHex?: string;
    forearmHex?: string;
    pantsHex: string;
    skinHex: string;
    frontArmHex?: string;
  }): void {
    this._shirt = this.hexToRgbArray(opts.shirtHex);
    this._sleeve = this.hexToRgbArray(opts.sleeveHex || opts.skinHex);
    this._forearm = this.hexToRgbArray(opts.forearmHex || opts.skinHex);
    this._pants = this.hexToRgbArray(opts.pantsHex);
    this._skin = this.hexToRgbArray(opts.skinHex);
    this._frontArm = this.hexToRgbArray(opts.frontArmHex || opts.skinHex);
  }

  private hexToRgbArray(hex: string): [number, number, number] {
    const c = Phaser.Display.Color.HexStringToColor(hex);
    return [c.redGL, c.greenGL, c.blueGL];
  }
}
