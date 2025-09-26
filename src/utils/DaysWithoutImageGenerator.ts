import { createCanvas, loadImage } from 'canvas';
import { Environment } from './constants';

export class DaysWithoutImageGenerator {
  private static readonly CANVAS_WIDTH = 600;
  private static readonly CANVAS_HEIGHT = 400;
  private static readonly BACKGROUND_COLOR = '#f0f0f0'; // fallback background color
  private static readonly TEXT_COLOR = '#000000';
  private static readonly NUMBER_COLOR = '#000000';
  private static readonly TEXT_LINE1_Y = 135;
  private static readonly TEXT_LINE2_Y = 200;
  private static readonly TEXT_LINE1_X = this.CANVAS_WIDTH / 4; // about 25%
  private static readonly TEXT_LINE2_X = (this.CANVAS_WIDTH / 2) - 15; // kinda in the middle, little left

  public static async generateDaysWithoutImage(
    triggerWord: string,
    daysSince: number
  ): Promise<Buffer> {
    const canvas = createCanvas(this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
    const ctx = canvas.getContext('2d');

    const bgPath = Environment.daysWithoutBackground || './assets/dayswithoutincident.png';
    try {
      const img = await loadImage(bgPath);
      ctx.drawImage(img, 0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
    } catch {
      ctx.fillStyle = this.BACKGROUND_COLOR;
      ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
    }

    ctx.fillStyle = this.TEXT_COLOR;
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`hours since we talked`, this.TEXT_LINE1_X, this.TEXT_LINE1_Y);
    ctx.fillText(`about ${triggerWord}`, this.TEXT_LINE2_X, this.TEXT_LINE2_Y);

    const numberOnBoardcenterX = 105;
    const numberOnBoardCenterY = 155;
    ctx.fillStyle = this.NUMBER_COLOR;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(numberOnBoardcenterX, numberOnBoardCenterY);
    ctx.rotate(-0.2);
    ctx.fillText(daysSince.toString(), 0, 0);
    ctx.restore();

    const numberInHandCenterX = 90;
    const numberInHandCenterY = 295;
    ctx.fillStyle = this.NUMBER_COLOR;
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(numberInHandCenterX, numberInHandCenterY);
    ctx.rotate(-0.2);
    ctx.fillText('0', 0, 0);
    ctx.restore();

    return canvas.toBuffer('image/png');
  }
}
