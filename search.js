document.addEventListener("DOMContentLoaded", function () {
  var container = document.getElementById('app');
  var providerData = container.dataset.providerdata;
  var criteriaData = container.dataset.criteriadata;

  if (container) {
    const EventBus = new Vue();

    Vue.component('v-search', {
      props: ['value'],
      template: `
<label>
  <input type="text"
         placeholder="Suche deinen Anbieter"
         v-bind:value="value"
         @input="$emit('typing', $event.target.value)">
</label>`,
      methods: {},
      computed: {}
    });

    Vue.component('v-item', {
      props: ['item', 'criteria'],
      template: `
<li>
  <a @click="select(item)">
    <h4>{{ item['Firmenname'] }}</h4>
  </a>
</li>`,
      methods: {
        select(item) {
          EventBus.$emit('select-item', this.item);
        }
      }
    });

    Vue.component('v-list', {
      props: ['list', 'criteria'],
      template: `
<ul class="v-search__list">
  <v-item v-for="item in list"
          :key="item.index"
          :item="item"
          :criteria="criteria"></v-item>
</ul>`
    });

    Vue.component('v-profile', {
      props: ['item', 'criteria'],
      template: `
<article class="anbieter" v-if="item">
  <header class="anbieter__header">
    <h3 class="anbieter__title">{{this.item['Firmenname']}}</h3>
  </header>
  <div class="anbieter__info">
    <template v-if="criteria[item['Kriterium-Websuche']]">
      <ul class="demands-list">
        <li class="demand">
          <h3 v-if="criteria[item['Kriterium-Websuche']]['empfehlung'] == 'no'" class="demand__title demand__no">
            <span class="demand__number">✕</span>
            {{ criteria[item['Kriterium-Websuche']]['title']}}
          </h3>
          <h3 v-if="criteria[item['Kriterium-Websuche']]['empfehlung'] == 'maybe'" class="demand__title demand__maybe">
            <span class="demand__number">?</span>
            {{ criteria[item['Kriterium-Websuche']]['title']}}
          </h3>
          <h3 v-if="criteria[item['Kriterium-Websuche']]['empfehlung'] == 'yes'" class="demand__title demand__yes">
            <span class="demand__number">✓</span>
            {{ criteria[item['Kriterium-Websuche']]['title']}}
          </h3>
          <p class="demand__text" v-html="displayCriteria"></p>
	  <p class="demand__text" v-if="criteria[item['Kriterium-Websuche']]['show_energymix'] == 'True'">
            (siehe <a :href="item['Kennzeichnung Link']" rel="nofollow">Strommix</a> von {{this.item['Firmenname']}})
          </p>
          <p v-if="item['Begründung']" class="demand__text" v-html="reasoning"></p>
        </li>
      </ul>

      <p class="anbieter__methode" v-if="criteria[item['Kriterium-Websuche']]['method_label']">
        {{ criteria[item['Kriterium-Websuche']]['method_label'] }}
      </p>  

      <p v-if="criteria[item['Kriterium-Websuche']]['show_profile'] == 'True'">
        <a class="extension" href="#">
          <svg class="icon extension__icon"
              role="img">
            <use xlink:href="/sites/all/themes/tweme/dist/images/sprite.svg#external-link">
          </svg>
          <h4 class="extension__title">ROBIN WOOD-Anbieterprofil von {{this.item['Firmenname']}}</h4>
        </a>
      </p>
    </template>
    <div class="anbieter__box">
      <h3>Weitere Infos zum Anbieter</h3>
      <p>
        {{ item['Firmenname']}}
        <br>
        <template v-if="item['Stadt']">{{ item['Adresse']}}, {{ item['PLZ']}} {{ item['Stadt']}}</template>
        <br>
        <template v-if="item['URL']"><a :href="item['URL']">{{ item['URL']}}</a>
      </p>
      <p v-if="item['Zertifizierung']">Ein oder mehrere Stromprodukte dieses Anbietern wurden mit diesen Siegeln/Labeln zertifiziert:<br>
        {{ item['Zertifizierung'] }}</p>
    </div>
    <div class="anbieter__box">
      <p>Permalink zum Teilen dieses Suchergebnisses<br> <a :href="makeHref" v-html="makeHref"></a></p>
    </div>
  </div>
</article>`,
      computed: {
        makeHref() {
          return `${window.location}?anbieter=${encodeURI(this.item['Firmenname'])}`;
        },
        reasoning() {
          return this.item['Begründung'].replace(/###/gi, "<br><br>• ").replace(/##/gi, '<br><br>');
        },
        displayCriteria() {
          return this.criteria[this.item['Kriterium-Websuche']]['text'].replace(/###/gi, "<br><br>• ").replace(/##/gi, '</p><p class="demand__text">');
        }
      }
    });

    var app = new Vue({
      el: '#app',
      data: {
        original: [],
        providers: [],
        search: '',
        results: [],
        searchIndex: null,
        criteria: {},
        selectedProvider: {},
        state: 'search' // or profile
      },
      template: `
<div class="v-search">
  <template v-if="state == 'search'">
    <template v-if="searchIndex">
      <v-search v-on:typing="this.searching"></v-search>
    </template>
    <p v-else>Anbieterdaten werden geladen</p>
    <v-list :list="this.results" :criteria="this.criteria"></v-list>
  </template>
  <template v-else>
    <template v-if="searchIndex">
      <v-search v-bind:value="selectedProvider['Firmenname']" v-on:typing="this.searching"></v-search>
    </template>
    <div class="v-search__result">
      <v-profile v-if=selectedProvider
               :item="selectedProvider"
               :criteria="this.criteria"></v-profile>
      <p v-else>Anbieter nicht gefunden</p>
    </div>
  </template>
</div>`,
      mounted: function() {
        let baseUrl = window.baseurl || '';

        const url = `${baseUrl}${providerData}`;

        EventBus.$on('select-item', item => {
          this.selectedProvider = item;
          this.state = 'profile';
        });

        Promise.all([
          fetch(url).then((response)=>{
            return response.json();
          }).then((data)=>{
            this.original = data;
            this.providers = this.original.store;
            // lunr index is prebuild in scripts/build_index.js
            this.searchIndex = lunr.Index.load(data.idx);
          }),
          fetch(`${baseUrl}${criteriaData}`)
            .then(response => {
              return response.text();
            }).then((data) => {
              let criteria = data.split('\n').slice(1).map(x => x.split(';'));
              criteria.forEach((v, i) => {
                let idx = v[0];
                this.criteria[idx] = {};
                this.criteria[idx]['cat'] = v[1];
                this.criteria[idx]['title'] = v[2];
                this.criteria[idx]['text'] = v[3];
                this.criteria[idx]['link'] = v[4];
                this.criteria[idx]['link_label'] = v[5];
                this.criteria[idx]['method_label'] = v[6];
                this.criteria[idx]['method_link'] = v[7];
                this.criteria[idx]['show_profile'] = v[8];
                this.criteria[idx]['show_energymix'] = v[9];
                this.criteria[idx]['empfehlung'] = v[10];
              });
            })]).then(() => {
              let params = window.location.search.split("?anbieter=");
              if (params.length != -1 && params.length > 1) {

                let results = Object.values(this.providers)
                    .filter((x, i) => encodeURI(x['Firmenname']) === params[1]);
                if (results.length < 0) {
                  console.log('Nothing found, try search');
                  this.state = 'search';
                } else {
                  this.selectedProvider = results[0];
                  this.state = 'profile';
                }
              } else {
                this.state = 'search';
              }
            });

      },
      methods: {
        searching(term) {
          this.state = 'search';
	  this.search = term;
          if (term.length > 2) {
            let results = this.searchIndex.search(term + '~1');
            this.results = results.map(v => {
              let indexAsInt = parseInt(v.ref, 10);
              return this.providers[indexAsInt];
            });
          } else {
            this.results = [];
          }
        },
        toSearch() {
          this.state = 'search';
        }
      }
    });
  }
});
