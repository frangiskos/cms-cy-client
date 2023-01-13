(() => {
    let cmsUrl = '';
    let project = '';
    try {
        cmsUrl = JSON.parse(document.getElementById('cms-cy-api').text).url;
        project = JSON.parse(document.getElementById('cms-cy-api').text).project;
        if (!cmsUrl || !project) throw new Error('API URL or project not defined.');
    } catch (error) {
        console.error(`API URL or project not defined. You can set it by including the following script in your page:
    <script id="cms-cy-api" type="application/json">{ "url": "https://projectapi.cms.cy", "project": "project-name" }</script>
    \n\n${error}`);
    }

    const graphQLApi = cmsUrl + '/graphql?';
    const gql = String.raw;
    const css = String.raw;

    const ArticleListComponentQuery = gql`
        query ArticleListComponent($project: String, $component: String) {
            #graphql
            component_article_list(
                filter: {
                    _and: [
                        { project: { code: { _eq: $project } } }
                        { name: { _eq: $component } }
                        { status: { _eq: "published" } }
                    ]
                }
            ) {
                columns
                rows
                spacing
                custom_code
                featured
                offset
                order_by
                order
                has_paging
                image_width
                aspect_ratio
                fit
                has_paging
                include_category_url_param
                include_category_url_path
                include_article_url_param
                include_categories {
                    ArticleCategories_id {
                        id
                        slug
                        title
                    }
                }
                include_articles {
                    Articles_id {
                        id
                        slug
                        title
                    }
                }
                project {
                    primary_color
                    secondary_color
                }
            }
        }
    `;

    const ArticleListQuery = gql`
        #graphql
        query ArticleList(
            $project: String
            $categories: [String]
            $articleIds: [GraphQLStringOrFloat]
            $sortField: [String] = ["-date_published"]
            $offset: Int = 0
            $limit: Int = 100
            $page: Int = 1
            $isFeatureFilterOperator: boolean_filter_operators = { _nnull: true }
        ) {
            # Get all articles
            Articles(
                page: $page
                filter: {
                    _and: [
                        { project: { code: { _eq: $project } } }
                        { is_feature: $isFeatureFilterOperator }
                        {
                            _or: [
                                { article_categories: { ArticleCategories_id: { slug: { _in: $categories } } } }
                                { id: { _in: $articleIds } }
                            ]
                        }
                    ]
                }
                sort: $sortField
                offset: $offset
                limit: $limit
            ) {
                id
                title
                slug
                date_published
                is_feature
                excerpt
                article_page
                featured_image {
                    id
                    title
                }
                article_categories {
                    ArticleCategories_id {
                        id
                        title
                        slug
                    }
                }
            }
            Articles_aggregated(
                filter: {
                    _and: [
                        { project: { code: { _eq: $project } } }
                        { is_feature: $isFeatureFilterOperator }
                        {
                            _or: [
                                { article_categories: { ArticleCategories_id: { slug: { _in: $categories } } } }
                                { id: { _in: $articleIds } }
                            ]
                        }
                    ]
                }
            ) {
                count {
                    id
                }
            }
        }
    `;

    const ArticleComponentQuery = gql`
        query ArticleComponent($project: String, $component: String) {
            #graphql
            component_single_article(
                filter: {
                    project: { code: { _eq: $project } }
                    name: { _eq: $component }
                    status: { _eq: "published" }
                }
            ) {
                article_slug
                custom_code
                image_width
                aspect_ratio
                fit
                project {
                    primary_color
                    secondary_color
                }
            }
        }
    `;

    const ArticleQuery = gql`
        #graphql
        query Article($project: String, $slug: String) {
            Articles(filter: { project: { code: { _eq: $project } }, slug: { _eq: $slug } }) {
                title
                body
                date_published
                is_feature
                article_image {
                    id
                    title
                }
                article_categories {
                    ArticleCategories_id {
                        id
                        title
                        slug
                    }
                }
                gallery(sort: "sort") {
                    directus_files_id {
                        id
                        title
                    }
                }
                files(sort: "sort") {
                    directus_files_id {
                        id
                        title
                        description
                        filename_download
                    }
                }
            }
        }
    `;

    const ArticleCategoriesQuery = gql`
        #graphql
        query ArticleCategories($project: String, $slug: String) {
            Articles(filter: { project: { code: { _eq: $project } }, slug: { _eq: $slug } }) {
                article_categories {
                    ArticleCategories_id {
                        id
                        title
                        slug
                    }
                }
            }
        }
    `;

    const fetchData = async (query, { variables = {} }) => {
        const headers = { 'Content-Type': 'application/json' };

        const res = await fetch(graphQLApi, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                query,
                variables,
            }),
        });

        const json = await res.json();

        if (json.errors) {
            console.error(json.errors);
            throw new Error('Failed to fetch data', json.errors);
        }

        return json;
    };

    const getData = async (query, variables = {}) => {
        const data = await fetchData(query, {
            variables,
        });
        return Object.keys(data.data).map((k) => data.data[k]);
    };

    const loadArticleList = async (name) => {
        const articleListComponent = await getData(ArticleListComponentQuery, { component: name, project });
        if (!articleListComponent || !articleListComponent.length || !articleListComponent[0].length) {
            console.error(`CMS Error: component "${name}" is not configured`);
            return '';
        }
        const component = articleListComponent[0][0];

        const categories = [];
        const articles = [];

        if (component.include_category_url_param || component.include_article_url_param) {
            const urlParams = new URLSearchParams(window.location.search);
            if (component.include_category_url_param) {
                const category = urlParams.get('category');
                if (category) {
                    categories.push(...category.split(','));
                }
            }

            if (component.include_article_url_param) {
                const articleSlug = urlParams.get('article');
                if (articleSlug) {
                    const articleCategories = await getData(ArticleCategoriesQuery, { project, slug: articleSlug });
                    if (articleCategories && articleCategories.length && articleCategories[0].length) {
                        categories.push(
                            ...articleCategories[0][0].article_categories.map((cat) => cat.ArticleCategories_id.slug)
                        );
                    }
                }
            }
        }

        if (component.include_category_url_path) {
            const urlPath = new URL(window.location.href).pathname;
            let category = urlPath.split('/').pop();
            if (category && category.indexOf('.html') !== -1) {
                category = category.slice(0, category.indexOf('.html'));
            }
            if (category) {
                categories.push(category);
            }
        }

        if (component.include_categories.length) {
            categories.push(...component.include_categories.map((cat) => cat.ArticleCategories_id.slug));
        }

        if (component.include_articles.length) {
            articles.push(...component.include_articles.map((article) => +article.Articles_id.id));
        }

        let currentPage = 1;
        if (component.has_paging) {
            const urlParams = new URLSearchParams(window.location.search);
            const pageParam = urlParams.get('page');
            if (pageParam && !isNaN(+pageParam)) {
                currentPage = +pageParam;
            }
        }

        const articleList = await getData(ArticleListQuery, {
            project,
            categories: categories.length ? categories : [''],
            articleIds: articles.length ? articles : [-1],
            sortField: (component.order === 'desc' ? '-' : '') + component.order_by,
            offset: component.offset,
            limit: component.columns * component.rows,
            page: currentPage,
            isFeatureFilterOperator:
                component.featured === 'all'
                    ? { _nnull: true }
                    : component.featured === 'show'
                    ? { _eq: true }
                    : { _eq: false },
        });
        if (!articleList || !articleList.length || !articleList[0].length) {
            console.warn(`CMS Warning: component "${name}" does not have any articles`);
            return '';
        }

        let previousPageUrl = '';
        let nextPageUrl = '';
        let totalPages = 1;
        const pages = [];
        if (component.has_paging) {
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.delete('page');
            const baseUrl = window.location.href.replace
                ? window.location.href.replace(window.location.search, '')
                : window.location.href.split('?')[0];

            totalPages = Math.ceil(articleList[1][0].count.id / (component.columns * component.rows));
            for (let i = 1; i <= totalPages; i++) {
                const url =
                    i === 1
                        ? urlParams.toString()
                            ? `${baseUrl}?${urlParams.toString()}`
                            : baseUrl
                        : urlParams.toString()
                        ? `${baseUrl}?${urlParams.toString()}&page=${i}`
                        : `${baseUrl}?page=${i}`;
                pages.push({
                    text: i,
                    url,
                    active: i === currentPage,
                });
                if (i === currentPage - 1) {
                    previousPageUrl = url;
                }
                if (i === currentPage + 1) {
                    nextPageUrl = url;
                }
            }
        }

        const totalHGap = component.spacing * (component.columns - 1);
        const itemGapSpace = Math.ceil(totalHGap / component.columns);
        const template = `
<style>
#${name}.cms-cy-posts__wrapper {
gap: ${component.spacing}px;
}
#${name}.cms-cy-posts__wrapper > * {
width: calc(100% / ${component.columns} - ${itemGapSpace}px);
}
</style>
${component.custom_code ? component.custom_code : ''}

<div id="${name}" class="cms-cy-posts__wrapper">
${articleList[0]
    .map(
        (item) => `
<div class="cms-cy-posts__item-wrapper">
  <div class="cms-cy-posts__item">
    <a class="cms-cy-posts__item-image" href="${window.location.href.split('/').shift()}/${item.article_page}?article=${
            item.slug
        }">
      <img src="${cmsUrl}/assets/${item.featured_image.id}?fit=${component.fit}&width=${
            component.image_width
        }&height=${Math.round(component.image_width * component.aspect_ratio)}&quality=80" alt="${
            item.featured_image.title
        }" width="${component.image_width}" height="${Math.round(
            component.image_width * component.aspect_ratio
        )}" loading="lazy">
    </a>
    <div class="cms-cy-posts__item-content">
      <div class="cms-cy-posts__item-date" style="color: ${component.project.primary_color};">${new Date(
            item.date_published
        ).toLocaleDateString('en-UK')}</div>
      <a class="cms-cy-posts__item-title" href="${window.location.href.split('/').shift()}/${
            item.article_page
        }?article=${item.slug}">
          <h3>${item.title}</h3>
      </a>
      ${item.excerpt ? '<p class="cms-cy-posts__item-excerpt">' + item.excerpt + '</p>' : ''}
    </div>
  </div>
</div>
`
    )
    .join('')}
    ${
        component.has_paging && pages.length > 1
            ? `<div class="cms-cy-posts__paging">
            <a ${previousPageUrl ? `href="${previousPageUrl}" class="previous"` : 'class="previous disabled"'}>
                <span class="sr-only">Previous</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
              </svg>
                </a>
        ${pages
            .map(
                (page) =>
                    `<a href="${page.url}" ${page.active ? 'class="page active"' : 'class="page"'}>${page.text}</a>`
            )
            .join('')}
         <a ${nextPageUrl ? `href="${nextPageUrl}" class="next"` : 'class="next disabled"'}>
            <span class="sr-only">Next</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
            </svg>
         </a>
    </div>`
            : ''
    }
</div>
`;

        return template;
    };

    const loadArticle = async (name) => {
        const articleComponent = await getData(ArticleComponentQuery, { project, component: name });
        if (!articleComponent || !articleComponent.length || !articleComponent[0].length) {
            console.error(`CMS Error: component "${name}" is not configured`);
            return '';
        }
        const component = articleComponent[0][0];
        let slug = component.article_slug;

        if (slug === 'url') {
            const urlParams = new URLSearchParams(window.location.search);
            slug = urlParams.get('article');
            if (!slug) {
                console.error(`CMS Warn: component "${name}" could not load article from URL`);
                return '';
            }
        }

        const articles = await getData(ArticleQuery, { project, slug });
        if (!articles || !articles.length || !articles[0].length) {
            console.error(`CMS Error: component "${name}" failed to load article "${slug}"`);
            return '';
        }
        const article = articles[0][0];

        if (article.gallery.length) {
            setTimeout(() => {
                const lightbox = window.GLightbox({
                    selector: '.glightbox',
                });

                const swiper = new window.Swiper('.mySwiper', {
                    spaceBetween: 10,
                    slidesPerView: 4,
                    freeMode: true,
                    watchSlidesProgress: true,
                });
                const swiper2 = new window.Swiper('.mySwiper2', {
                    spaceBetween: 10,
                    navigation: {
                        nextEl: '.swiper-button-next',
                        prevEl: '.swiper-button-prev',
                    },
                    thumbs: {
                        swiper: swiper,
                    },
                });
            }, 0);
        }

        const template = `
    ${component.custom_code ? component.custom_code : ''}
    
    <div id="${name}" class="cms-cy-post__wrapper">
        <div class="cms-cy-post__header">
            <h1 class="cms-cy-post__title">${article.title}</h1>
            <div class="cms-cy-post__date" style="color: ${component.project.primary_color};">${new Date(
            article.date_published
        ).toLocaleDateString('en-UK')}</div>
        </div>
        <div class="cms-cy-post__content">
            <div class="cms-cy-post__media">
                ${
                    article.gallery.length === 0
                        ? `
                <div class="cms-cy-post__image">
                    <img src="${cmsUrl}/assets/${article.article_image.id}?fit=${component.fit}&width=${
                              component.image_width
                          }&height=${Math.round(component.image_width * component.aspect_ratio)}&quality=80" alt="${
                              article.article_image.title
                          }" width="${component.image_width}" height="${Math.round(
                              component.image_width * component.aspect_ratio
                          )}">
                </div>`
                        : article.gallery.length === 1
                        ? `
                <div class="cms-cy-post__image">
                    <a href="${cmsUrl}/assets/${
                              article.gallery[0].directus_files_id.id
                          }" class="glightbox" data-type="image">
                        <img src="${cmsUrl}/assets/${article.gallery[0].directus_files_id.id}?fit=${
                              component.fit
                          }&width=${component.image_width}&height=${Math.round(
                              component.image_width * component.aspect_ratio
                          )}&quality=80" alt="${article.article_image.title}" width="${
                              component.image_width
                          }" height="${Math.round(component.image_width * component.aspect_ratio)}" loading="lazy" />
                    </a>
                </div>`
                        : `
                <div class="cms-cy-post__gallery">
                    <!-- Swiper -->
                    <div style="--swiper-navigation-color: #fff; --swiper-pagination-color: #fff; --swiper-navigation-size: 20px;" class="swiper mySwiper2">
                        <div class="swiper-wrapper">
                            ${article.gallery
                                .map(
                                    (img, ix) => `
                            <div class="swiper-slide">
                                <a href="${cmsUrl}/assets/${
                                        img.directus_files_id.id
                                    }" class="glightbox" data-type="image">
                                    <img src="${cmsUrl}/assets/${img.directus_files_id.id}?fit=${component.fit}&width=${
                                        component.image_width
                                    }&height=${Math.round(
                                        component.image_width * component.aspect_ratio
                                    )}&quality=80" alt="${article.article_image.title}" width="${
                                        component.image_width
                                    }" height="${Math.round(component.image_width * component.aspect_ratio)}" ${
                                        ix > 1 ? 'loading="lazy"' : ''
                                    } />
                                </a>
                            </div>`
                                )
                                .join('')}
                        </div>
                        <div class="swiper-button-next"></div>
                        <div class="swiper-button-prev"></div>
                    </div>
                    
                    <div thumbsSlider="" class="swiper mySwiper">
                        <div class="swiper-wrapper">
                            ${article.gallery
                                .map(
                                    (img, ix) => `
                            <div class="swiper-slide">
                                <img src="${cmsUrl}/assets/${img.directus_files_id.id}?fit=${component.fit}&width=${
                                        component.image_width
                                    }&height=${Math.round(
                                        component.image_width * component.aspect_ratio
                                    )}&quality=80" alt="${article.article_image.title}" width="${
                                        component.image_width
                                    }" height="${Math.round(component.image_width * component.aspect_ratio)}" ${
                                        ix > 1 ? 'loading="lazy"' : ''
                                    } />
                            </div>`
                                )
                                .join('')}
                        </div>
                    </div>
                </div>`
                }
                ${
                    article.files.length
                        ? `
                <div class="cms-cy-post__files">
                    ${article.files
                        .map(
                            (file) => `
                    <div class="cms-cy-post__file">
                        <a
                            ${file.directus_files_id.description ? 'class="tooltip"' : ''}
                            href="${cmsUrl}/assets/${file.directus_files_id.id}?download" target="_blank" download="${
                                file.directus_files_id.filename_download
                            }">
                            ${
                                file.directus_files_id.description
                                    ? `<span class="tooltip_text">` + file.directus_files_id.description + `</span>`
                                    : ''
                            }
                                ${file.directus_files_id.title}
                        </a>
                    </div>`
                        )
                        .join('')}
                </div>`
                        : ''
                }



            </div>
            <div class="cms-cy-post__body">${article.body}</div>
        </div>
    </div>
    `;

        return template;
    };

    (() => {
        let cmsElements = document.querySelectorAll('[cms-control]');
        if (cmsElements.length) {
            const cssCy = document.createElement('style');
            cssCy.innerHTML = css`
                body {
                    margin: 0;
                }
                .cms-cy-posts__wrapper {
                    display: flex;
                    flex-wrap: wrap;
                }
                .cms-cy-posts__wrapper > * {
                    display: flex;
                    flex: 0 1 auto;
                }
                .cms-cy-posts__item-wrapper {
                    animation: var(--animation-fade-in) forwards;
                }
                .cms-cy-posts__item {
                    display: flex;
                    flex-direction: column;
                    word-break: break-word;
                }
                .cms-cy-posts__item .cms-cy-posts__item-image {
                    margin-bottom: 1.2rem;
                }
                .cms-cy-posts__item .cms-cy-posts__item-content {
                    display: flex;
                    flex-direction: column;
                }
                .cms-cy-posts__item .cms-cy-posts__item-date {
                    font-size: 20px;
                    font-weight: bold;
                }
                .cms-cy-posts__item .cms-cy-posts__item-title {
                    text-decoration: none;
                    color: rgba(0, 0, 0, 0.87);
                }
                .cms-cy-posts__item-image img {
                    width: 100%;
                    height: auto;
                }
                @media (max-width: 767px) {
                    .cms-cy-posts__wrapper {
                        flex-direction: column;
                    }
                    .cms-cy-posts__wrapper > * {
                        width: auto !important;
                    }
                }

                .cms-cy-post__wrapper .cms-cy-post__title {
                    margin-top: 0;
                }
                .cms-cy-post__wrapper .cms-cy-post__date {
                    font-size: 24px;
                    font-weight: bold;
                    padding-bottom: 10px;
                }
                .cms-cy-post__wrapper .cms-cy-post__image img {
                    width: 100%;
                    height: auto;
                }
                .cms-cy-post__wrapper .cms-cy-post__gallery {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                }
                .cms-cy-post__wrapper .cms-cy-post__gallery li {
                    list-style: none;
                }
                .cms-cy-post__wrapper .cms-cy-post__date {
                    margin-bottom: 16px;
                }

                .cms-cy-post__wrapper .cms-cy-post__files a {
                    color: rgb(66, 99, 235);
                    text-decoration: none;
                    font-size: 1.1em;
                }
                .cms-cy-post__wrapper .cms-cy-post__files a:hover {
                    text-decoration: underline;
                }
                .cms-cy-post__wrapper .tooltip {
                    position: relative;
                    display: inline-block;
                }
                .cms-cy-post__wrapper .tooltip .tooltip_text {
                    visibility: hidden;
                    width: 180px;
                    background-color: #555;
                    color: #fff;
                    text-align: center;
                    border-radius: 6px;
                    padding: 5px 10px;
                    position: absolute;
                    z-index: 1;
                    bottom: 125%;
                    left: 50%;
                    transform: translate3d(-50%, 0, 0);
                    opacity: 0;
                    transition: opacity 0.3s;
                    white-space: pre-wrap;
                    word-break: break-word;
                }
                .cms-cy-post__wrapper .tooltip .tooltip_text::after {
                    content: '';
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    margin-left: -5px;
                    border-width: 5px;
                    border-style: solid;
                    border-color: #555 transparent transparent transparent;
                }
                .cms-cy-post__wrapper .tooltip:hover .tooltip_text {
                    visibility: visible;
                    opacity: 1;
                }

                @media (max-width: 767px) {
                    .cms-cy-post__wrapper {
                        margin-bottom: 24px;
                    }
                }

                .cms-cy-posts__paging {
                    margin-top: 40px;
                    box-shadow: 0 4px 12px rgb(100 100 100 / 60%);
                    border-radius: 500px;
                    width: fit-content !important;
                }

                .cms-cy-posts__paging a {
                    color: inherit;
                    border: 1px solid;
                    min-width: 40px;
                    text-align: center;
                    line-height: 40px;
                    min-height: 40px;
                    margin: 0;
                    padding: 0;
                }

                .cms-cy-posts__paging a:visited {
                    color: inherit;
                }

                .cms-cy-posts__paging a.disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .cms-cy-posts__paging a.active {
                    border: 2px solid;
                }
                .cms-cy-posts__paging a.previous,
                .cms-cy-posts__paging a.next {
                    min-width: 60px;
                    text-align: center;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .cms-cy-posts__paging a.previous svg,
                .cms-cy-posts__paging a.next svg {
                    width: 32px;
                    height: 32px;
                }
                .cms-cy-posts__paging a.previous {
                    border-radius: 500px 0 0 500px;
                }
                .cms-cy-posts__paging a.next {
                    border-radius: 0 500px 500px 0;
                }
                .sr-only {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    padding: 0;
                    margin: -1px;
                    overflow: hidden;
                    clip: rect(0, 0, 0, 0);
                    white-space: nowrap;
                    border-width: 0;
                }
                @media (max-width: 767px) {
                    .cms-cy-posts__paging a.previous,
                    .cms-cy-posts__paging a.next {
                        min-width: 80px;
                    }
                    .cms-cy-posts__paging a.page {
                        display: none;
                    }
                }
            `;

            // `
            // :root {
            //     --cms-cy-main-color: #16f;
            //     --cms-cy-accent-color: #ff7;
            //   }
            //   .cms-cy-posts__wrapper {
            //     background-color: var(--cms-cy-main-color);
            //   }
            // `;
            document.querySelector('body').prepend(cssCy);
        }

        Array.from(cmsElements).forEach((element) => {
            const type = element.getAttribute('type');
            const name = element.getAttribute('name');

            switch (type) {
                case 'article-list': {
                    loadArticleList(name).then((template) => {
                        element.innerHTML = template;
                    });
                    break;
                }
                case 'single-article': {
                    loadArticle(name).then((template) => {
                        // const articleElement = document.createElement('article');
                        // articleElement.innerHTML = template;
                        // element.parentNode.replaceChild(articleElement, element);
                        element.innerHTML = template;
                    });
                    break;
                }
            }
        });
    })();
})();
