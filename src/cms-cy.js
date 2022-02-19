const graphQLApi = cmsUrl + '/graphql?';
const gql = String.raw;
const css = String.raw;

const ArticleListComponentQuery = gql`
    query ArticleListComponent($component: String) {
        #graphql
        component_article_list(filter: { name: { _eq: $component }, status: { _eq: "published" } }) {
            columns
            rows
            spacing
            custom_code
            featured
            offset
            order_by
            order
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
        $categories: [String]
        $articleIds: [Float]
        $sortField: [String] = ["-date_published"]
        $offset: Int = 0
        $limit: Int = 100
        $isFeatureFilterOperator: boolean_filter_operators = { _nnull: true }
    ) {
        # Get all articles
        Articles(
            filter: {
                _and: [
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
    }
`;

const ArticleComponentQuery = gql`
    query ArticleComponent($component: String) {
        #graphql
        component_single_article(filter: { name: { _eq: $component }, status: { _eq: "published" } }) {
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
    query Article($slug: String) {
        Articles(filter: { slug: { _eq: $slug } }) {
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
            gallery {
                sort
                directus_files_id {
                    id
                    title
                }
            }
        }
    }
`;

const ArticleCategoriesQuery = gql`
    #graphql
    query ArticleCategories($slug: String) {
        Articles(filter: { slug: { _eq: $slug } }) {
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
    return data.data[Object.keys(data.data)[0]];
};

const loadArticleList = async (name) => {
    const articleListComponent = await getData(ArticleListComponentQuery, { component: name });
    if (!articleListComponent || !articleListComponent.length) {
        console.error(`CMS Error: component "${name}" is not configured`);
        return '';
    }
    const component = articleListComponent[0];

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
                const articleCategories = await getData(ArticleCategoriesQuery, { slug: articleSlug });
                if (articleCategories && articleCategories.length) {
                    categories.push(
                        ...articleCategories[0].article_categories.map((cat) => cat.ArticleCategories_id.slug)
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

    const articleList = await getData(ArticleListQuery, {
        categories: categories.length ? categories : [''],
        articleIds: articles.length ? articles : [-1],
        sortField: (component.order === 'desc' ? '-' : '') + component.order_by,
        offset: component.offset,
        limit: component.columns * component.rows,
        isFeatureFilterOperator:
            component.featured === 'all'
                ? { _nnull: true }
                : component.featured === 'show'
                ? { _eq: true }
                : { _eq: false },
    });
    if (!articleList || !articleList.length) {
        console.warn(`CMS Warning: component "${name}" does not have any articles`);
        return '';
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
${articleList
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
</div>
`;

    return template;
};

const loadArticle = async (name) => {
    const articleComponent = await getData(ArticleComponentQuery, { component: name });
    if (!articleComponent || !articleComponent.length) {
        console.error(`CMS Error: component "${name}" is not configured`);
        return '';
    }
    const component = articleComponent[0];
    let slug = component.article_slug;

    if (slug === 'url') {
        const urlParams = new URLSearchParams(window.location.search);
        slug = urlParams.get('article');
        if (!slug) {
            console.error(`CMS Warn: component "${name}" could not load article from URL`);
            return '';
        }
    }

    const articles = await getData(ArticleQuery, { slug });
    if (!articles || !articles.length) {
        console.error(`CMS Error: component "${name}" failed to load article "${slug}"`);
        return '';
    }
    const article = articles[0];

    let template = '';
    if (article.gallery.length) {
        template +=
            `
            <div class="cms-cy-post__gallery">
                <ul>` +
            article.gallery
                .map(
                    (img) => `
                    <li>
                        <a href="${cmsUrl}/assets/${img.directus_files_id.id}?fit=cover&width=600&height=600&quality=80" class="glightbox" data-type="image">
                            <img src="${cmsUrl}/assets/${img.directus_files_id.id}?fit=cover&width=200&height=150&quality=80" alt="${img.directus_files_id.title}" loading="lazy">
                        </a>
                    </li>`
                )
                .join('') +
            `
                </ul>
            </div>`;
    }
    console.log(template);
    setTimeout(() => {
        const lightbox = window.GLightbox({
            selector: '.glightbox',
            // https://swiperjs.com/demos
            // touchNavigation: true,
            // loop: true,
            // elements: [
            //     ...article.gallery.map((img) => ({
            //         href: `${cmsUrl}/assets/${img.directus_files_id.id}?fit=cover&width=600&height=600`,
            //         type: 'image',
            //     })),
            // ],
        });
        // lightbox.open(0);
    }, 0);
    template += `
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
                <div class="cms-cy-post__image">
                    <img src="${cmsUrl}/assets/${article.article_image.id}?fit=${component.fit}&width=${
        component.image_width
    }&height=${Math.round(component.image_width * component.aspect_ratio)}&quality=80" alt="${
        article.article_image.title
    }" width="${component.image_width}" height="${Math.round(component.image_width * component.aspect_ratio)}">
                </div>
                ${
                    article.gallery.length
                        ? `
                <div class="cms-cy-post__gallery">
                    <ul>`
                        : ''
                }
                        ${article.gallery
                            .map(
                                (img) => `
                        <li>
                            <img src="${cmsUrl}/assets/${img.directus_files_id.id}?fit=cover&width=200&height=150&quality=80" alt="${img.directus_files_id.title}" loading="lazy">
                        </li>`
                            )
                            .join('')}
                    ${
                        article.gallery.length
                            ? `
                    </ul>
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
            @media (max-width: 767px) {
                .cms-cy-post__wrapper {
                    margin-bottom: 24px;
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
                    element.innerHTML = template;
                });
                break;
            }
        }
    });
})();
