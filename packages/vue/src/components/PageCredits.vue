<template>
    <v-container fluid>
        <v-row>
            <!-- Contributors Column -->
            <v-col cols="6" class="d-flex">
                <v-sheet border="md"
                         color="surface-light"
                         rounded="lg"
                         class="credits-sheet">
                    <h2 class="column-title">Contributors</h2>
                    <ul>
                        <li v-for="partner in partners" :key="partner.name">
                            <a :href="partner.url" target="_blank" rel="noopener noreferrer">
                                <img :src="partner.logo" :alt="partner.name" :width="partner.w" />
                            </a>
                        </li>
                    </ul>
                </v-sheet>
            </v-col>

            <!-- Software Column -->
            <v-col cols="6" class="d-flex">
                <v-sheet border="md"
                         color="surface-light"
                         rounded="lg"
                         class="credits-sheet">
                    <h2 class="column-title">Software Used</h2>
                    <div class="px-4 pb-4">
                        <p class="intro-text">
                            The CASCaRA Reference Implementation has been built with the software components listed
                            below. These are fine pieces of software and we gratefully thank the authors for
                            their effort.
                        </p>
                        <v-table density="compact">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Purpose</th>
                                    <th>License</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="software in softwareUsed" :key="software.name">
                                    <td>
                                        <a :href="software.url" target="_blank" rel="noopener noreferrer">{{ software.name }}</a>
                                    </td>
                                    <td>{{ software.purpose }}</td>
                                    <td>
                                        <a :href="software.licenseUrl" target="_blank" rel="noopener noreferrer">{{ software.license }}</a>
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                    </div>
                </v-sheet>
            </v-col>
        </v-row>
    </v-container>
</template>

<script lang="ts">
    import { Options, Vue } from 'vue-class-component';

    @Options({
        name: 'PageCredits',
        data() {
            return {
                partners: [
                    { name: 'enso managers', url: 'https://enso-managers.de/', logo: '/assets/logos/enso-m logo 200x50 transparent.png', w: 200 },
                    { name: 'PSG', url: 'https://psg-inc.net/', logo: '/assets/logos/logo-psg.jpg', w: 180 },
                    { name: 'inomic solutions', url: 'https://inomic-solutions.com/', logo: '/assets/logos/INOMIC-Logo-dark.png', w: 180 }
                ],
                softwareUsed: [
                    { name: 'Vue.js', url: 'https://vuejs.org/', purpose: 'UI framework', license: 'MIT', licenseUrl: 'https://opensource.org/licenses/MIT' },
                    { name: 'Vuetify', url: 'https://vuetifyjs.com/', purpose: 'Material component library', license: 'MIT', licenseUrl: 'https://opensource.org/licenses/MIT' },
                    { name: 'Vue Router', url: 'https://router.vuejs.org/', purpose: 'Client-side routing', license: 'MIT', licenseUrl: 'https://opensource.org/licenses/MIT' },
                    { name: 'TypeScript', url: 'https://www.typescriptlang.org/', purpose: 'Typed JavaScript', license: 'Apache-2.0', licenseUrl: 'https://opensource.org/licenses/Apache-2.0' },
                    { name: 'Vite', url: 'https://vitejs.dev/', purpose: 'Build tool / dev server', license: 'MIT', licenseUrl: 'https://opensource.org/licenses/MIT' },
                    { name: 'Ajv', url: 'https://ajv.js.org/', purpose: 'JSON Schema validation', license: 'MIT', licenseUrl: 'https://opensource.org/licenses/MIT' },
                    { name: 'Saxon-JS', url: 'https://www.saxonica.com/saxon-js/', purpose: 'XSLT/XPath processing', license: 'MPL-2.0', licenseUrl: 'https://opensource.org/licenses/MPL-2.0' },
                    { name: 'Jest', url: 'https://jestjs.io/', purpose: 'Unit testing framework', license: 'MIT', licenseUrl: 'https://opensource.org/licenses/MIT' },
                    { name: 'Playwright', url: 'https://playwright.dev/', purpose: 'End-to-end testing', license: 'Apache-2.0', licenseUrl: 'https://opensource.org/licenses/Apache-2.0' },
                    { name: 'ESLint', url: 'https://eslint.org/', purpose: 'Code linting', license: 'MIT', licenseUrl: 'https://opensource.org/licenses/MIT' },
                    { name: 'npm', url: 'https://www.npmjs.com/', purpose: 'Package management', license: 'Artistic-2.0', licenseUrl: 'https://opensource.org/licenses/Artistic-2.0' },
                    { name: 'Node.js', url: 'https://nodejs.org/', purpose: 'JavaScript runtime', license: 'MIT', licenseUrl: 'https://opensource.org/licenses/MIT' }
                ]
            };
        }
    })
    export default class PageCredits extends Vue { }
</script>

<style scoped>
    .credits-sheet {
        width: 100%;
        min-width: 0;
    }

    .credits-sheet :deep(table) {
        width: 100%;
        table-layout: fixed;
    }

    .credits-sheet :deep(td),
    .credits-sheet :deep(th) {
        overflow-wrap: break-word;
    }

    .column-title {
        text-align: center;
        padding: 15px 0;
        margin: 0;
        font-size: 1.25rem;
    }

    .intro-text {
        margin: 0 10px 15px 10px;
    }

    ul {
        display: flex;
        flex-direction: column;
        align-items: center;
        list-style: none;
        padding: 0;
        margin: 10px 20px;
    }

    li {
        margin-bottom: 20px;
    }
</style>
