import type { Request, Response } from 'express';
import Parse from 'parse/node';

export async function testGameScore(_req: Request, res: Response): Promise<void> {
  try {
    const GameScore = Parse.Object.extend('GameScore');
    const gameScore = new GameScore();

    gameScore.set('score', 1337);
    gameScore.set('playerName', 'Test Player');
    gameScore.set('chpitopitoChampion', false);

    const result = await gameScore.save(null, { useMasterKey: true });

    res.json({
      status: 'ok',
      message: 'Parse Server is working correctly',
      created: {
        objectId: result.id,
        score: result.get('score'),
        playerName: result.get('playerName'),
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
