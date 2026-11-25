import Phaser from "phaser";

/**
 * Isolates only #ffff00 (front swinging hand), #ffbb00 (forearm sleeve), and #888800 (1px outline)
 * so the swinging front arm naturally renders in front of static outerwear overlays.
 */
export default class FrontArmPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private _armColor: [number, number, number] = [0.98, 0.95, 0.91];
  private _forearmColor: [number, number, number] = [0.98, 0.95, 0.91];
  private _outlineColor: [number, number, number] = [0.067, 0.067, 0.067];

  constructor(game: Phaser.Game) {
    super({
      game,
      name: "FrontArmPipeline",
      fragShader: `
        precision mediump float;
        uniform sampler2D uMainSampler;
        varying vec2 outTexCoord;

        uniform vec3 uArmColor;
        uniform vec3 uForearmColor;
        uniform vec3 uOutlineColor;

        void main() {
          vec4 texColor = texture2D(uMainSampler, outTexCoord);

          if (texColor.a > 0.1 && distance(texColor.rgb, vec3(1.0, 1.0, 0.0)) < 0.05) {
            gl_FragColor = vec4(uArmColor, texColor.a);
          } else if (texColor.a > 0.1 && distance(texColor.rgb, vec3(1.0, 0.733, 0.0)) < 0.05) {
            gl_FragColor = vec4(uForearmColor, texColor.a);
          } else if (texColor.a > 0.1 && distance(texColor.rgb, vec3(0.533, 0.533, 0.0)) < 0.05) {
            gl_FragColor = vec4(uOutlineColor, texColor.a);
          } else {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
          }
        }
      `,
    });
  }

  private applyUniforms(): void {
    this.set3f("uArmColor", this._armColor[0], this._armColor[1], this._armColor[2]);
    this.set3f("uForearmColor", this._forearmColor[0], this._forearmColor[1], this._forearmColor[2]);
    this.set3f("uOutlineColor", this._outlineColor[0], this._outlineColor[1], this._outlineColor[2]);
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

  public setArmColors(handHex: string, forearmHex?: string): void {
    const h = Phaser.Display.Color.HexStringToColor(handHex);
    const f = Phaser.Display.Color.HexStringToColor(forearmHex || handHex);
    this._armColor = [h.redGL, h.greenGL, h.blueGL];
    this._forearmColor = [f.redGL, f.greenGL, f.blueGL];
  }
}
