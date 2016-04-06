import Rx from 'rx';
import rp from 'request-promise';
import ballparks from '../../data/ballparks.json';
import DBpediaService from './dbpedia.service';

const _ballparksCache = [];
class BallparksService {
  all() {
    // TODO cache the Rx way - clear it every day hour
    if (_ballparksCache.length > 0) {
      return Rx.Observable.from(_ballparksCache);
    }
    return Rx.Observable
      .from(ballparks)
      .concatMap(park =>
        BallparksService
          ._withDetail(park.name)
          .map(r => {
            return {
              ...park,
              ...r
            };
          }))
      .do(park => _ballparksCache.push(park));
  }

  byId(id) {
    const $ballparks = _ballparksCache.length > 0 ?
      Rx.Observable.from(_ballparksCache) :
      this.all();

    return $ballparks
      .toArray()
      .map(ballparks => ballparks[Number.parseInt(id)-1]);
  }

  static _withDetail(name) {
    //?park foaf:name "${name}"@en ;
    const query = `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX d: <http://dbpedia.org/ontology/>

      SELECT ?name ?thumb ?description ?openingDate WHERE {
              ?park rdfs:label "AT&T Park"@en ;
                    d:thumbnail ?thumb ;
                    d:abstract ?description ;
                    foaf:isPrimaryTopicOf ?name ;
                    d:openingDate ?openingDate .
          FILTER ( lang(?description) = "en")
      }
    `;
    return DBpediaService
      .sparql(query)
      .map(r => {
        const b = r.results.bindings.length > 0 ? r.results.bindings[0] : null;
        if (!b) {
          console.log(`${name} has no results`);
        }
        return {
          wikipediaUrl: b ? b.name.value : null,
          image: {
            thumb: b ? b.thumb.value : null
          },
          description: b ? b.description.value : null,
          openingDate: b ? b.openingDate.value : null
        };
      });
  }
}

export default new BallparksService();