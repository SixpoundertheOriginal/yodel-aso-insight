
import { ScrapedMetadata } from './aso';

export class AmbiguousSearchError extends Error {
  public readonly candidates: ScrapedMetadata[];
  public readonly searchTerm: string;

  constructor(candidates: ScrapedMetadata[], searchTerm: string) {
    super(`Multiple apps found for "${searchTerm}". User selection required.`);
    this.name = 'AmbiguousSearchError';
    this.candidates = candidates;
    this.searchTerm = searchTerm;
  }
}
