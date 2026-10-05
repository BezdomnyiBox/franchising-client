// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '@/shared/config';
import './SearchContainer.css';

/** Единый бэкенд: back.public.lan через /crm_fr/api. */
const BACK_HOST = API_BASE_URL;
const CRM_HOST = API_BASE_URL;

const TAB_OFFERS_ALL = 'all';

const TAB_SEARCHED = 'searched';
const TAB_ANALOGS = 'analogs';
const OFFERS_TAB_AVAILABLE = 'available';
const OFFERS_TAB_ORDER = 'offer';

const EMPTY_OFFERS = {
    available: [],
    offer: [],
};

const inFlightOffersLoadKeys = new Set();
const completedOffersLoadKeys = new Set();
const inFlightFetchByUrl = new Map();

const resetOffersLoadTracking = () => {
    inFlightOffersLoadKeys.clear();
    completedOffersLoadKeys.clear();
    inFlightFetchByUrl.clear();
};

const fetchSupplierGoods = (url, init = {}) => {
    const existing = inFlightFetchByUrl.get(url);
    if (existing) {
        return existing;
    }

    const request = fetch(url, init).finally(() => {
        if (inFlightFetchByUrl.get(url) === request) {
            inFlightFetchByUrl.delete(url);
        }
    });

    inFlightFetchByUrl.set(url, request);
    return request;
};

const money = n => n.toLocaleString('ru-RU') + ' ₽';

const CITIES_PREVIEW_COUNT = 4;

const BRANDS_PREVIEW_COUNT = 8;

const formatBrandsMoreCount = (count) => {
    const n = Number(count) || 0;
    const n10 = n % 10;
    const n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return `Ещё ${n} бренд ▾`;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return `Ещё ${n} бренда ▾`;
    return `Ещё ${n} брендов ▾`;
};

const formatWarehouseCount = (count) => {
    const n = Number(count) || 0;
    const n10 = n % 10;
    const n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return `${n} поставщик`;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return `${n} поставщиков`;
    return `${n} складов`;
};

const formatCitiesMoreCount = (count) => {
    const n = Number(count) || 0;
    const n10 = n % 10;
    const n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return `Ещё ${n} город`;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return `Ещё ${n} города`;
    return `Ещё ${n} городов`;
};

const fetchCities = ({ article, brand, branchId, requestId, requestIdRef }) => {
    const params = buildGoodsParams({ article, brand, branchId });

    return fetch(`${BACK_HOST}/supplier-goods/cities?${params}`, {
        method: 'GET',
        credentials: 'include',
    })
        .then((response) => response.json())
        .then((data) => {
            if (requestId !== requestIdRef.current) {
                return null;
            }
            return Array.isArray(data) ? data : [];
        })
        .catch(() => {
            if (requestId !== requestIdRef.current) {
                return null;
            }
            return [];
        });
};

const normalizeOffers = (data) => {
    const source = data?.available || data?.offer
        ? data
        : data?.offers;

    if (!source || typeof source !== 'object' || Array.isArray(source)) {
        return { ...EMPTY_OFFERS };
    }

    return {
        available: Array.isArray(source.available) ? source.available : [],
        offer: Array.isArray(source.offer) ? source.offer : [],
    };
};

const resolveImageSrc = (src) => {
    if (!src) return null;
    if (/^https?:\/\//i.test(src)) return src;
    if (src.startsWith('/image/')) {
        return `${API_BASE_URL}/product${src}`;
    }
    return `${API_BASE_URL}${src.startsWith('/') ? src : `/${src}`}`;
};

const formatAssemblyTime = (assemblyTime) => {
    if (!assemblyTime) return '—';
    try {
        const date = new Date(assemblyTime);
        if (isNaN(date.getTime())) return assemblyTime;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch {
        return assemblyTime;
    }
};

const buildGoodsParams = ({
    article, branchId, brand, orderNumber, offersType, source, supplierAlias,
}) => {
    const params = new URLSearchParams({ article });
    if (branchId) {
        params.set('branchId', String(branchId));
    }
    if (brand) {
        params.set('brand', brand);
    }
    if (orderNumber) {
        params.set('orderNumber', orderNumber);
    }
    if (offersType) {
        params.set('offersType', offersType);
    }
    if (source) {
        params.set('source', source);
    }
    if (supplierAlias) {
        params.set('supplierAlias', supplierAlias);
    }
    return params;
};

const dedupeSuppliersByAlias = (suppliers) => {
    const byAlias = new Map();

    (Array.isArray(suppliers) ? suppliers : []).forEach((supplier) => {
        const alias = supplier?.alias;
        if (!alias || byAlias.has(alias)) {
            return;
        }
        byAlias.set(alias, {
            alias,
            name: supplier.name || alias,
        });
    });

    return [...byAlias.values()];
};

const normalizeSupplierOfferGroups = (groups) => {
    const byAlias = new Map();

    (Array.isArray(groups) ? groups : []).forEach((group) => {
        if (!group?.alias || byAlias.has(group.alias)) {
            return;
        }
        byAlias.set(group.alias, group);
    });

    return [...byAlias.values()];
};

const fetchApiSuppliers = (branchId) => {
    const params = new URLSearchParams();
    if (branchId) {
        params.set('branchId', String(branchId));
    }
    return fetch(`${BACK_HOST}/supplier-goods/api-suppliers?${params}`, {
        method: 'GET',
        credentials: 'include',
    })
        .then((response) => response.json())
        .then((data) => dedupeSuppliersByAlias(data))
        .catch(() => []);
};

const computeOfferRanges = (offers) => {
    if (!offers.length) {
        return null;
    }

    const prices = offers
        .map((offer) => Number(offer.offerPrice || offer.price))
        .filter((price) => !Number.isNaN(price) && price > 0);
    const days = offers.map((offer) => getOfferDays(offer));

    if (!prices.length) {
        return null;
    }

    const priceMin = Math.min(...prices);
    const priceMax = Math.max(...prices);
    const dayMin = Math.min(...days);
    const dayMax = Math.max(...days);
    const priceLabel = priceMin === priceMax
        ? money(priceMin)
        : `${money(priceMin)} – ${money(priceMax)}`;
    const deliveryLabel = dayMin === dayMax
        ? (dayMin <= 1 ? 'завтра' : `${dayMin} дн.`)
        : `${dayMin}–${dayMax} дн.`;

    return { priceLabel, deliveryLabel };
};

const mergeSupplierOffers = (groups) => groups.flatMap((group) => group.offers || []);

const loadSupplierOffersParallel = ({
    baseParams,
    branchId,
    requestId,
    requestIdRef,
    onGroupsInit,
    onGroupUpdate,
    onAllComplete,
}) => fetchApiSuppliers(branchId).then((suppliers) => {
    if (requestId !== requestIdRef.current) {
        return;
    }

    const groups = dedupeSuppliersByAlias(suppliers).map((supplier) => ({
        alias: supplier.alias,
        name: supplier.name || supplier.alias,
        loading: true,
        offers: [],
        expanded: false,
    }));

    onGroupsInit(groups);

    if (!groups.length) {
        onAllComplete();
        return;
    }

    let pending = groups.length;
    groups.forEach((group) => {
        const params = buildGoodsParams({
            ...baseParams,
            offersType: OFFERS_TAB_ORDER,
            supplierAlias: group.alias,
        });

        const requestUrl = `${BACK_HOST}/supplier-goods?${params}`;

        fetchSupplierGoods(requestUrl, {
            method: 'GET',
            credentials: 'include',
        })
            .then((response) => response.json())
            .then((data) => {
                if (requestId !== requestIdRef.current) {
                    return;
                }
                onGroupUpdate(group.alias, {
                    loading: false,
                    offers: parseOffersList(data, OFFERS_TAB_ORDER),
                });
            })
            .catch(() => {
                if (requestId !== requestIdRef.current) {
                    return;
                }
                onGroupUpdate(group.alias, {
                    loading: false,
                    offers: [],
                });
            })
            .finally(() => {
                pending -= 1;
                if (requestId === requestIdRef.current && pending <= 0) {
                    onAllComplete();
                }
            });
    });
});

const mergeBrandVariants = (previous, incoming) => {
    const byKey = new Map();

    [...previous, ...incoming].forEach((item) => {
        if (!item?.brand || !item?.article) {
            return;
        }

        const key = `${item.brand}|${item.article}`;
        const existing = byKey.get(key);
        if (!existing) {
            byKey.set(key, {
                brand: item.brand,
                article: item.article,
                name: item.name || 'Деталь',
                images: Array.isArray(item.images) ? item.images : [],
            });
            return;
        }

        byKey.set(key, {
            ...existing,
            name: existing.name && existing.name !== 'Деталь' ? existing.name : (item.name || existing.name),
            images: existing.images.length
                ? existing.images
                : (Array.isArray(item.images) ? item.images : []),
        });
    });

    return [...byKey.values()];
};

const fetchBrandVariantsGroup = ({
    baseParams,
    source,
    requestId,
    requestIdRef,
    onVariants,
    onError,
    onFinally,
}) => {
    const params = buildGoodsParams({ ...baseParams, source });

    return fetch(`${BACK_HOST}/supplier-goods/brands?${params}`, {
        method: 'GET',
        credentials: 'include',
    })
        .then((response) => response.json())
        .then((variantsList) => {
            if (requestId !== requestIdRef.current) {
                return;
            }
            onVariants(Array.isArray(variantsList) ? variantsList : []);
        })
        .catch(() => {
            if (requestId !== requestIdRef.current) {
                return;
            }
            onError();
        })
        .finally(() => {
            if (requestId === requestIdRef.current) {
                onFinally();
            }
        });
};

const fetchOffersGroup = ({ baseParams, offersType, requestId, requestIdRef, setOffers, setLoading }) => {
    const params = buildGoodsParams({ ...baseParams, offersType });

    const requestUrl = `${BACK_HOST}/supplier-goods?${params}`;

    return fetchSupplierGoods(requestUrl, {
        method: 'GET',
        credentials: 'include',
    })
        .then((response) => response.json())
        .then((data) => {
            if (requestId !== requestIdRef.current) {
                return;
            }
            setOffers((previous) => ({
                ...previous,
                [offersType]: parseOffersList(data, offersType),
            }));
        })
        .catch(() => {
            if (requestId !== requestIdRef.current) {
                return;
            }
            setOffers((previous) => ({
                ...previous,
                [offersType]: [],
            }));
        })
        .finally(() => {
            if (requestId === requestIdRef.current) {
                setLoading(false);
            }
        });
};

const parseOffersList = (data, offersType) => {
    if (Array.isArray(data)) {
        return data;
    }
    if (Array.isArray(data?.[offersType])) {
        return data[offersType];
    }
    if (Array.isArray(data?.offers)) {
        return data.offers;
    }
    return normalizeOffers(data)[offersType] || [];
};

const buildSearchPath = ({ article, brand, orderNumber } = {}) => {
    const params = new URLSearchParams();
    if (article) {
        params.set('article', article);
    }
    if (brand) {
        params.set('brand', brand);
    }
    if (orderNumber) {
        params.set('orderNumber', orderNumber);
    }
    const query = params.toString();
    return query ? `/search?${query}` : '/search';
};

const AddToOrderModal = ({ good, offer, initialOrderNumber = '', onClose }) => {
    const [orderNumber, setOrderNumber] = useState(initialOrderNumber || '');

    const handleAddToOrder = () => {
        if (!orderNumber) {
            return;
        }

        fetch(`${CRM_HOST}/order/add_offer_product`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                orderNumber,
                brand: good.brand,
                article: good.article,
                name: good.name,
                price: offer.price,
                offerPrice: offer.offerPrice,
                quantity: offer.stock,
                warehouseVendorId: offer.warehouseVendorId,
                supplierAlias: offer.supplierAlias,
                deliveryDuration: offer.deliveryDuration,
                multiplicity: offer.multiplicity,
            }),
        })
            .then((response) => response.json())
            .then((result) => {
                if (result.result === 'success') window.alert('Товар добавлен в заказ');
                else window.alert(result.message);
            })
            .then(() => onClose())
            .catch((error) => {
                window.alert(error.message);
                onClose();
            });
    };

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return (
        <div className="search-modal-backdrop" onClick={onClose} role="presentation">
            <div
                className="search-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-to-order-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="search-modal__title">
                    <h2 id="add-to-order-title" className="search-modal__heading">
                        Добавить товар в заказ
                    </h2>
                    <p className="search-modal__line">
                        {good.brand} / {good.article}
                    </p>
                    <p className="search-modal__line">{good.name}</p>
                    <p className="search-modal__line">Цена: {offer.offerPrice} руб.</p>
                    <p className="search-modal__line">
                        Срок поставки: {formatAssemblyTime(offer.assemblyTime)}
                    </p>
                    <p className="search-modal__line">
                        Склад: {offer.warehousePublicName} ({offer.warehousePublicNumber})
                    </p>
                    <label className="search-modal__label" htmlFor="order-number-input">
                        Номер заказа
                    </label>
                    <input
                        id="order-number-input"
                        className="search-modal__field"
                        value={orderNumber}
                        onChange={(event) => setOrderNumber(event.target.value)}
                    />
                </div>
                <div className="search-modal__actions">
                    <button
                        type="button"
                        className="search-btn search-btn--outlined-secondary"
                        onClick={onClose}
                    >
                        Отменить
                    </button>
                    <button
                        type="button"
                        className="search-btn search-btn--contained-primary"
                        onClick={handleAddToOrder}
                    >
                        Добавить
                    </button>
                </div>
            </div>
        </div>
    );
};

const getGoodImageSrc = (good) => {
    if (!good || !Array.isArray(good.images) || !good.images.length) return null;
    return resolveImageSrc(good.images[0]);
};

const getOfferDays = (offer) => {
    if (!offer?.assemblyTime) return 1;
    return Math.max(1, Math.ceil((new Date(offer.assemblyTime) - Date.now()) / 86400000));
};

const getEtaSpeed = (days) => {
    if (days <= 1) return 'fast';
    if (days <= 2) return 'mid';
    return 'slow';
};

const computeOfferStats = (offersGroups) => {
    const available = offersGroups.available || [];
    const order = offersGroups.offer || [];
    const all = [...available, ...order];
    const prices = all
        .map((item) => Number(item.offerPrice || item.price))
        .filter((price) => !Number.isNaN(price) && price > 0);
    const minPrice = prices.length ? Math.min(...prices) : null;
    let nearestEta = null;
    let nearestDays = Infinity;

    all.forEach((offer) => {
        const days = getOfferDays(offer);
        if (days < nearestDays) {
            nearestDays = days;
            nearestEta = formatAssemblyTime(offer.assemblyTime);
        }
    });

    return {
        total: all.length,
        availableCount: available.length,
        offerCount: order.length,
        minPrice,
        nearestEta,
    };
};

const getFilteredOffers = (offersGroups, tab) => {
    if (tab === OFFERS_TAB_AVAILABLE) return offersGroups.available || [];
    if (tab === OFFERS_TAB_ORDER) return offersGroups.offer || [];
    return [...(offersGroups.available || []), ...(offersGroups.offer || [])];
};

const getOfferPrice = (offer) => Number(offer.offerPrice || offer.price) || 0;

const getOffersPriceRange = (offers) => {
    const prices = (offers || [])
        .map((offer) => getOfferPrice(offer))
        .filter((price) => price > 0);

    if (!prices.length) {
        return { min: '', max: '' };
    }

    return {
        min: String(Math.min(...prices)),
        max: String(Math.max(...prices)),
    };
};

const rankOffer = (offer) => getOfferDays(offer) * 100000 + getOfferPrice(offer);

const EMPTY_OFFER_FILTERS = {
    priceFrom: '',
    priceTo: '',
    days: '',
    warehouse: '',
    sort: 'eta',
};

const matchWarehouse = (offer, query) => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) {
        return true;
    }

    return [
        offer.warehousePublicNumber,
        offer.warehousePublicName,
        offer.warehouseVendorId,
        offer.supplierName,
        offer.supplierAlias,
    ].some((value) => String(value || '').toLowerCase().includes(q));
};

const filterOffers = (offers, filters) => {
    const from = filters.priceFrom === '' ? null : Number(filters.priceFrom);
    const to = filters.priceTo === '' ? null : Number(filters.priceTo);
    const maxDays = filters.days === '' ? null : Number(filters.days);

    return (offers || []).filter((offer) => {
        const price = getOfferPrice(offer);
        if (from != null && !Number.isNaN(from) && price < from) {
            return false;
        }
        if (to != null && !Number.isNaN(to) && price > to) {
            return false;
        }
        if (maxDays != null && !Number.isNaN(maxDays) && getOfferDays(offer) > maxDays) {
            return false;
        }
        return matchWarehouse(offer, filters.warehouse);
    });
};

const sortOffers = (offers, sort) => {
    const next = [...(offers || [])];
    next.sort((a, b) => {
        if (sort === 'price') {
            return getOfferPrice(a) - getOfferPrice(b);
        }
        if (sort === 'days') {
            return getOfferDays(a) - getOfferDays(b);
        }
        if (sort === 'qty') {
            return Number(b.stock || 0) - Number(a.stock || 0);
        }
        return rankOffer(a) - rankOffer(b);
    });
    return next;
};

const applyOfferFilters = (offers, filters) => sortOffers(filterOffers(offers, filters), filters.sort);

const AppOfferRow = ({ good, offer, isBest, isFast, initialOrderNumber, offersType }) => {
    const [viewModal, setViewModal] = useState(false);
    const supplierLabel = offer.warehousePublicName
        ? offer.warehousePublicName
        : (offer.supplierName || offer.warehousePublicName || '');
    const days = getOfferDays(offer);
    const speed = getEtaSpeed(days);
    const displayPrice = offer.offerPrice || offer.price;

    return (
        <tr className={isBest ? 'best' : ''}>
            <td data-l="Склад и поставщик">
                <span className="cellwh">
                    {isBest ? (
                        <>
                            <span className="badge-best">Рекомендуем</span>
                            <br />
                        </>
                    ) : null}
                    {supplierLabel}
                    <small>{offer.warehousePublicNumber} {offer.rating ? ` ★ ${offer.rating}` : ''}</small>
                </span>
            </td>
            <td data-l="Цена">
                <span className="pr">
                    {money(Number(displayPrice) || 0)}
                    <small>за 1 шт.</small>
                </span>
            </td>
            <td data-l="Готовность к выдаче">
                <span className="eta">
                    <span className={`d ${speed}`} />
                    <b>{formatAssemblyTime(offer.assemblyTime)}</b>
                    {isFast ? <small>· самый быстрый</small> : null}
                </span>
            </td>
            <td className="qty" data-l="Кол-во">
                <b>{offer.stock}</b> <small>шт.</small>
            </td>
            <td className="warr" data-l="Гарантия">{offer.warranty || '—'}</td>
            <td className="act" data-l="Действие">
                {viewModal ? (
                    <AddToOrderModal
                        good={good}
                        offer={offer}
                        initialOrderNumber={initialOrderNumber}
                        onClose={() => setViewModal(false)}
                    />
                ) : (
                    <button type="button" className="add" onClick={() => setViewModal(true)}>
                        <svg className="ic" viewBox="0 0 24 24">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        В заказ
                    </button>
                )}
            </td>
        </tr>
    );
};

const AppOffersTable = ({ good, offers, initialOrderNumber, offersType }) => {
    if (!offers.length) {
        return <div className="empty-msg">Нет предложений</div>;
    }

    const bestId = [...offers].sort((a, b) => rankOffer(a) - rankOffer(b))[0]?.supplierGoodItemId;
    const fastestDays = Math.min(...offers.map((offer) => getOfferDays(offer)));

    return (
        <table>
            <thead>
                <tr>
                    <th>Склад и поставщик</th>
                    <th>Цена</th>
                    <th>Готовность к выдаче</th>
                    <th>Кол-во</th>
                    <th>Гарантия</th>
                    <th className="r">Действие</th>
                </tr>
            </thead>
            <tbody>
                {offers.map((offer) => (
                    <AppOfferRow
                        key={offer.supplierAlias + '|' + offer.warehouseVendorId}
                        good={good}
                        offer={offer}
                        isBest={offer.bestId}
                        isFast={offer.isFast}
                        initialOrderNumber={initialOrderNumber}
                        offersType={offersType}
                    />
                ))}
            </tbody>
        </table>
    );
};

const SupplierOfferAccordion = ({
    good, group, initialOrderNumber, onToggle,
}) => {
    const ranges = computeOfferRanges(group.offers);
    const canExpand = !group.loading && group.offers.length > 0;

    return (
        <div className={`card pp supplier-offer${!group.expanded ? ' cl' : ''}${canExpand ? ' supplier-offer--expandable' : ''}`}>
            <button
                type="button"
                className="pp-h"
                onClick={() => {
                    if (canExpand) {
                        onToggle(group.alias);
                    }
                }}
                aria-expanded={group.expanded}
            >
                <span className="chev">
                    <svg className="ic" viewBox="0 0 24 24">
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </span>
                <span className="pp-t">
                    <span className="n">{group.name}</span>
                    {group.loading ? (
                        <span className="a supplier-offer__status">Загрузка предложений...</span>
                    ) : ranges ? (
                        <span className="a">{ranges.priceLabel} · {ranges.deliveryLabel}</span>
                    ) : (
                        <span className="a supplier-offer__status">Нет предложений</span>
                    )}
                </span>
                <span className="pp-sum">
                    {group.loading ? (
                        <span className="supplier-offer__spinner" aria-label="Загрузка" />
                    ) : group.offers.length > 0 ? (
                        <span className="pill ord">
                            <span className="dot" />
                            {group.offers.length} под заказ
                        </span>
                    ) : (
                        <span className="pill no">
                            <span className="dot" />
                            Пусто
                        </span>
                    )}
                </span>
            </button>
            {group.expanded && group.offers.length > 0 ? (
                <div className="pp-body">
                    <AppOffersTable
                        good={good}
                        offers={group.offers}
                        initialOrderNumber={initialOrderNumber}
                        offersType={OFFERS_TAB_ORDER}
                    />
                </div>
            ) : null}
        </div>
    );
};

const SupplierOffersPanel = ({ good, groups, initialOrderNumber, onToggleSupplier, filters }) => {
    if (!groups.length) {
        return <div className="empty-msg">Нет поставщиков для API-поиска</div>;
    }

    const visibleGroups = groups
        .map((group) => ({
            ...group,
            offers: applyOfferFilters(group.offers, filters),
        }))
        .filter((group) => group.loading || group.offers.length > 0);

    if (!visibleGroups.length) {
        return <div className="empty-msg">Нет предложений под заказ</div>;
    }

    return (
        <div className="supplier-offers-list">
            {visibleGroups.map((group) => (
                <SupplierOfferAccordion
                    key={group.alias}
                    good={good}
                    group={group}
                    initialOrderNumber={initialOrderNumber}
                    onToggle={onToggleSupplier}
                />
            ))}
        </div>
    );
};

const OffersPointCard = ({ good, offers, availableCount, orderCount, offersTab, initialOrderNumber, collapsed, onToggle }) => {
    const displayTab = offersTab === TAB_OFFERS_ALL ? OFFERS_TAB_AVAILABLE : offersTab;

    return (
        <div className={`card pp${collapsed ? ' cl' : ''}`}>
            <button type="button" className="pp-h" onClick={onToggle}>
                <span className="chev">
                    <svg className="ic" viewBox="0 0 24 24">
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </span>
                <span className="pp-t">
                    <span className="n">Предложения по товару</span>
                    <span className="a">{good.brand} / {good.article}{good.name ? ` · ${good.name}` : ''}</span>
                </span>
                <span className="pp-sum">
                    {availableCount > 0 ? (
                        <span className="pill ok">
                            <span className="dot" />
                            {availableCount} в наличии
                        </span>
                    ) : null}
                    {orderCount > 0 ? (
                        <span className="pill ord">
                            <span className="dot" />
                            {orderCount} под заказ
                        </span>
                    ) : null}
                </span>
            </button>
            <div className="pp-body">
                <AppOffersTable
                    good={good}
                    offers={offers}
                    initialOrderNumber={initialOrderNumber}
                    offersType={displayTab}
                />
            </div>
        </div>
    );
};

const OffersMainSection = ({
    good,
    offers,
    offersLoading,
    supplierOfferGroups,
    onToggleSupplier,
    initialOrderNumber,
    cities = [],
    citiesLoading = false,
    currentTownId,
}) => {
    const [offersTab, setOffersTab] = useState(OFFERS_TAB_AVAILABLE);
    const [pointCollapsed, setPointCollapsed] = useState(false);
    const [filters, setFilters] = useState(EMPTY_OFFER_FILTERS);
    const priceFilterTouchedRef = useRef(false);
    const offersGroups = normalizeOffers(offers);
    const stats = computeOfferStats(offersGroups);
    const availableLoading = Boolean(offersLoading.available);
    const orderLoading = Boolean(offersLoading.offer);
    const activeLoading = availableLoading || orderLoading;
    const sourceOffers = useMemo(() => [
        ...(offersGroups.available || []),
        ...(offersGroups.offer || []),
        ...(supplierOfferGroups || []).flatMap((group) => group.offers || []),
    ], [offersGroups.available, offersGroups.offer, supplierOfferGroups]);
    const priceRange = useMemo(() => getOffersPriceRange(sourceOffers), [sourceOffers]);
    const availableOffers = applyOfferFilters(offersGroups.available || [], filters);
    const filteredOrderOffers = applyOfferFilters(offersGroups.offer || [], filters);
    const showAvailable = offersTab === OFFERS_TAB_AVAILABLE || offersTab === TAB_OFFERS_ALL;
    const showOrder = offersTab === OFFERS_TAB_ORDER || offersTab === TAB_OFFERS_ALL;
    const orderMinPrice = useMemo(() => {
        const prices = filteredOrderOffers
            .map((item) => getOfferPrice(item))
            .filter((price) => price > 0);
        return prices.length ? Math.min(...prices) : null;
    }, [filteredOrderOffers]);

    const lastAutoOffersTabGoodRef = useRef('');

    const handleFilterChange = (field) => (event) => {
        if (field === 'priceFrom' || field === 'priceTo') {
            priceFilterTouchedRef.current = true;
        }
        setFilters((previous) => ({
            ...previous,
            [field]: event.target.value,
        }));
    };

    useEffect(() => {
        priceFilterTouchedRef.current = false;
        setFilters(EMPTY_OFFER_FILTERS);
    }, [good.brand, good.article]);

    useEffect(() => {
        if (priceFilterTouchedRef.current || (!priceRange.min && !priceRange.max)) {
            return;
        }
        setFilters((previous) => ({
            ...previous,
            priceFrom: priceRange.min,
            priceTo: priceRange.max,
        }));
    }, [priceRange.min, priceRange.max]);

    useEffect(() => {
        const goodKey = `${good.brand}|${good.article}`;
        if (lastAutoOffersTabGoodRef.current === goodKey) {
            return;
        }
        lastAutoOffersTabGoodRef.current = goodKey;

        if (availableLoading || offersGroups.available.length) {
            setOffersTab(OFFERS_TAB_AVAILABLE);
            return;
        }
        if (orderLoading || offersGroups.offer.length) {
            setOffersTab(OFFERS_TAB_ORDER);
        }
    }, [
        offersGroups.available.length,
        offersGroups.offer.length,
        availableLoading,
        orderLoading,
        good.brand,
        good.article,
    ]);

    return (
        <>
            <div className="card fbar">
                <div className="seg">
                    <button
                        type="button"
                        className={offersTab === OFFERS_TAB_AVAILABLE ? 'on' : ''}
                        onClick={() => setOffersTab(OFFERS_TAB_AVAILABLE)}
                    >
                        В наличии
                        <span className="n">{availableLoading ? '…' : stats.availableCount}</span>
                    </button>
                    <button
                        type="button"
                        className={offersTab === OFFERS_TAB_ORDER ? 'on' : ''}
                        onClick={() => setOffersTab(OFFERS_TAB_ORDER)}
                    >
                        Под заказ
                        <span className="n">{orderLoading ? '…' : stats.offerCount}</span>
                    </button>
                    <button
                        type="button"
                        className={offersTab === TAB_OFFERS_ALL ? 'on' : ''}
                        onClick={() => setOffersTab(TAB_OFFERS_ALL)}
                    >
                        Все
                        <span className="n">{activeLoading ? '…' : stats.total}</span>
                    </button>
                </div>
            </div>

            <div className="card fbar" style={{ marginTop: 10 }}>
                <div className="fld">
                    <label htmlFor="f-from">Цена от:</label>
                    <span className="inp num">
                        <input
                            id="f-from"
                            type="number"
                            min="0"
                            placeholder="0"
                            value={filters.priceFrom}
                            onChange={handleFilterChange('priceFrom')}
                        />
                        <i>₽</i>
                    </span>
                    <label htmlFor="f-to">до:</label>
                    <span className="inp num">
                        <input
                            id="f-to"
                            type="number"
                            min="0"
                            placeholder="—"
                            value={filters.priceTo}
                            onChange={handleFilterChange('priceTo')}
                        />
                        <i>₽</i>
                    </span>
                </div>
                <div className="fld">
                    <label htmlFor="f-days">Срок доставки, дн.:</label>
                    <span className="inp num">
                        <input
                            id="f-days"
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Все"
                            value={filters.days}
                            onChange={handleFilterChange('days')}
                        />
                    </span>
                </div>
                <div className="fld">
                    <label htmlFor="f-wh">Склад:</label>
                    <span className="inp">
                        <input
                            id="f-wh"
                            placeholder="ID или название"
                            value={filters.warehouse}
                            onChange={handleFilterChange('warehouse')}
                            style={{ width: '130px' }}
                        />
                    </span>
                </div>
                <div className="sp">
                    <div className="sortsel">Сортировка
                        <select value={filters.sort} onChange={handleFilterChange('sort')}>
                            <option value="eta">Срок, затем цена</option>
                            <option value="price">Цена</option>
                            <option value="days">Срок доставки</option>
                            <option value="qty">Количество</option>
                        </select>
                    </div>
                </div>
            </div>

            {offersTab === OFFERS_TAB_AVAILABLE && (stats.offerCount > 0 || orderLoading) ? (
                <div className="hint">
                    <svg className="ic" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 8h.01M11 12h1v4h1" />
                    </svg>
                    <div>
                        {orderLoading ? (
                            <>Идёт загрузка предложений под заказ у поставщиков...</>
                        ) : (
                            <>
                                Под заказ доступно ещё <b>{stats.offerCount} предложений</b>
                                {orderMinPrice ? <> — от {money(orderMinPrice)}</> : null}.
                                {' '}
                                <button type="button" className="hint-link" onClick={() => setOffersTab(TAB_OFFERS_ALL)}>
                                    Показать их вместе с наличием
                                </button>
                                , чтобы предложить клиенту выбор.
                            </>
                        )}
                    </div>
                </div>
            ) : null}

            <div hidden={!showAvailable}>
                {availableLoading ? (
                    <div className="card loading-card">
                        <span className="loading-card__spinner" aria-label="Загрузка" />
                        <span>Загрузка наличия...</span>
                    </div>
                ) : availableOffers.length > 0 ? (
                    <OffersPointCard
                        good={good}
                        offers={availableOffers}
                        availableCount={availableOffers.length}
                        orderCount={filteredOrderOffers.length}
                        offersTab={OFFERS_TAB_AVAILABLE}
                        initialOrderNumber={initialOrderNumber}
                        collapsed={pointCollapsed}
                        onToggle={() => setPointCollapsed((value) => !value)}
                    />
                ) : offersTab === OFFERS_TAB_AVAILABLE ? (
                    <div className="empty-msg">Нет предложений в наличии</div>
                ) : null}
            </div>

            <div hidden={!showOrder}>
                {orderLoading && !supplierOfferGroups.length ? (
                    <div className="card loading-card">
                        <span className="loading-card__spinner" aria-label="Загрузка" />
                        <span>Загрузка предложений под заказ...</span>
                    </div>
                ) : (
                    <SupplierOffersPanel
                        good={good}
                        groups={supplierOfferGroups}
                        initialOrderNumber={initialOrderNumber}
                        onToggleSupplier={onToggleSupplier}
                        filters={filters}
                    />
                )}
            </div>

            <div className="card pp cl" data-screen-label="ПВЗ OZON Крыгина" hidden>
                <button className="pp-h">
                    <span className="chev">
                        <svg className="ic" viewBox="0 0 24 24">
                            <path d="M6 9l6 6 6-6">
                            </path>
                        </svg>
                    </span>
                    <span className="pp-t">
                        <span className="n">Пункт выдачи OZON · Крыгина, 15</span>
                        <span className="a">г. Владивосток, ул. Крыгина, д. 15</span>
                    </span>
                    <span className="pp-sum">
                        <span className="pill ok">
                            <span className="dot">
                            </span>2 в наличии</span>
                        <span className="pill ord">
                            <span className="dot">
                            </span>3 под заказ</span>
                    </span>
                </button>
                <div className="pp-body">
                    <table>
                        <thead>
                            <tr>
                                <th>Склад и поставщик</th>
                                <th>Цена</th>
                                <th>Готовность к выдаче</th>
                                <th>Кол-во</th>
                                <th>Гарантия</th>
                                <th className="r">Действие</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="best">
                                <td data-l="Склад">
                                    <span className="cellwh">
                                        <span className="badge-best">Рекомендуем</span>
                                        <br />12<small>Ягло Г.А.</small>
                                    </span>
                                </td>
                                <td data-l="Цена">
                                    <span className="pr">912 ₽<small>за 1 шт.</small>
                                    </span>
                                </td>
                                <td data-l="Готовность">
                                    <span className="eta">
                                        <span className="d fast">
                                        </span>
                                        <b>Завтра, 14:30</b>
                                    </span>
                                </td>
                                <td data-l="Кол-во" className="qty">
                                    <b>4</b> <small>шт.</small>
                                </td>
                                <td data-l="Гарантия" className="warr">
                                    1 год (СТО)
                                </td>
                                <td className="act">
                                    <button className="add">
                                        <svg className="ic" viewBox="0 0 24 24">
                                            <path d="M12 5v14M5 12h14">
                                            </path>
                                        </svg>В заказ</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <CitiesBlock
                cities={cities}
                loading={citiesLoading}
                article={good.article}
                currentTownId={currentTownId}
            />
        </>
    );
};

const CitiesBlock = ({ cities, loading, article, currentTownId }) => {
    const [expanded, setExpanded] = useState(false);
    const otherCities = (Array.isArray(cities) ? cities : []).filter((city) => (
        currentTownId == null || Number(city.id) !== Number(currentTownId)
    ));

    if (!loading && !otherCities.length) {
        return null;
    }

    const visibleCities = expanded ? otherCities : otherCities.slice(0, CITIES_PREVIEW_COUNT);
    const hiddenCount = otherCities.length - visibleCities.length;

    return (
        <div className="card" id="cities">
            <div className="c-h">
                <span className="i">
                    <svg className="ic ic-l" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9">
                        </circle>
                        <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z">
                        </path>
                    </svg>
                </span>
                <div className="t">
                    <b>Наличие в других городах</b>
                    <div>Доставка транспортной компанией · только наличие</div>
                </div>
                {article ? (
                    <span className="pill no">
                        <span className="dot" />
                        {article}
                    </span>
                ) : null}
            </div>
            {loading && !otherCities.length ? (
                <div className="empty-msg">Загрузка городов...</div>
            ) : visibleCities.map((city) => {
                const available = Number(city.available) || 0;
                const api = Number(city.api) || 0;

                return (
                    <div className="crow" key={city.id}>
                        <div className="cn">
                            <b>{city.name}</b>
                        </div>
                        {available > 0 ? (
                            <span className="pill ok">
                                <span className="dot" />
                                В наличии · {formatWarehouseCount(available)}
                            </span>
                        ) : null}
                        {api > 0 ? (
                            <span className="pill ord">
                                <span className="dot" />
                                Под заказ · {formatWarehouseCount(api)}
                            </span>
                        ) : null}
                        {available === 0 && api === 0 ? (
                            <span className="pill no">
                                <span className="dot" />
                                Нет наличия
                            </span>
                        ) : null}
                        <button className="an-open go" data-city="Уссурийск">Открыть поиск<svg className="ic" viewBox="0 0 24 24">
                            <path d="M5 12h14M13 6l6 6-6 6">
                            </path>
                        </svg>
                        </button>
                    </div>
                );
            })}
            {hiddenCount > 0 ? (
                <button type="button" className="c-more" onClick={() => setExpanded(true)}>
                    {formatCitiesMoreCount(hiddenCount)}
                </button>
            ) : null}
        </div>
    );
};

const ProductSidebar = ({ good, offers, analogsCount, loading }) => {
    if (!good) return null;

    const imageSrc = getGoodImageSrc(good);
    const stats = computeOfferStats(normalizeOffers(offers));

    return (
        <aside className="side">
            <div className="card pcard">
                <div className="pimg">
                    {imageSrc ? (
                        <img
                            className="pimg__photo"
                            src={imageSrc}
                            alt={`${good.brand || ''} ${good.article || ''}`.trim() || 'Товар'}
                        />
                    ) : (
                        <>
                            <div className="ph" />
                            <em>фото товара</em>
                        </>
                    )}
                </div>
                <div>
                    <h1 className="ptitle">{good.name || '—'}</h1>
                    <div className="pmeta">
                        <b>{good.brand}</b> / <span className="mono">{good.article}</span>
                    </div>
                    <dl className="kv">
                        <dt>Предложений</dt>
                        <dd>{loading ? '…' : stats.total}</dd>
                        <dt>Цена от</dt>
                        <dd>{loading ? '…' : (stats.minPrice ? money(stats.minPrice) : '—')}</dd>
                        <dt>Ближайшая выдача</dt>
                        <dd>{loading ? '…' : (stats.nearestEta || '—')}</dd>
                        <dt>Аналогов</dt>
                        <dd>{analogsCount}</dd>
                    </dl>
                </div>
            </div>
        </aside>
    );
};

const BrandSelector = ({ brands, selectedBrand, onSelect }) => {
    const [expanded, setExpanded] = useState(false);

    if (!brands.length) return null;

    const visibleBrands = expanded ? brands : brands.slice(0, BRANDS_PREVIEW_COUNT);
    const hiddenCount = brands.length - visibleBrands.length;

    return (
        <div className="brandline">
            <span>Бренд:</span>
            {visibleBrands.map((brand) => (
                <button
                    key={brand}
                    type="button"
                    className={`bchip${selectedBrand === brand ? ' on' : ''}`}
                    onClick={() => onSelect(brand)}
                >
                    {brand}
                    {selectedBrand === brand ? (
                        <svg className="ic" viewBox="0 0 24 24" style={{ width: 12, height: 12 }}>
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    ) : null}
                </button>
            ))}
            {hiddenCount > 0 ? (
                <button type="button" className="bmore" onClick={() => setExpanded(true)}>
                    {formatBrandsMoreCount(hiddenCount)}
                </button>
            ) : null}
        </div>
    );
};

const AnalogItemApp = ({ item, branchId, orderNumber }) => {
    const [expanded, setExpanded] = useState(false);
    const [offers, setOffers] = useState(EMPTY_OFFERS);
    const [offersLoaded, setOffersLoaded] = useState(false);
    const [availableLoading, setAvailableLoading] = useState(false);
    const [offerLoading, setOfferLoading] = useState(false);
    const [supplierOfferGroups, setSupplierOfferGroups] = useState([]);
    const offersGroups = normalizeOffers(offers);
    const stats = computeOfferStats(offersGroups);
    const minPrice = useMemo(() => {
        const prices = [...offersGroups.available, ...offersGroups.offer]
            .map((offer) => Number(offer.offerPrice || offer.price))
            .filter((price) => !Number.isNaN(price) && price > 0);
        return prices.length ? Math.min(...prices) : Number(item.price) || null;
    }, [item.price, offersGroups.available, offersGroups.offer]);
    const etaLabel = useMemo(() => {
        const all = [...offersGroups.available, ...offersGroups.offer];
        if (all.length) {
            const best = all.slice().sort((a, b) => getOfferDays(a) - getOfferDays(b))[0];
            return formatAssemblyTime(best?.assemblyTime);
        }
        if (item.assemblyTime) return formatAssemblyTime(item.assemblyTime);
        return '—';
    }, [item.assemblyTime, offersGroups.available, offersGroups.offer]);

    const availableRequestIdRef = useRef(0);
    const offerRequestIdRef = useRef(0);

    const loadDetails = useCallback(() => {
        if (offersLoaded || availableLoading || offerLoading) {
            return;
        }

        const availableRequestId = availableRequestIdRef.current + 1;
        const offerRequestId = offerRequestIdRef.current + 1;
        availableRequestIdRef.current = availableRequestId;
        offerRequestIdRef.current = offerRequestId;
        setOffers(EMPTY_OFFERS);
        setSupplierOfferGroups([]);
        setAvailableLoading(true);
        setOfferLoading(true);
        setOffersLoaded(true);

        const baseParams = {
            article: item.article,
            branchId,
            brand: item.brand,
            orderNumber,
        };

        fetchOffersGroup({
            baseParams,
            offersType: OFFERS_TAB_AVAILABLE,
            requestId: availableRequestId,
            requestIdRef: availableRequestIdRef,
            setOffers,
            setLoading: setAvailableLoading,
        });

        loadSupplierOffersParallel({
            baseParams,
            branchId,
            requestId: offerRequestId,
            requestIdRef: offerRequestIdRef,
            onGroupsInit: (groups) => {
                setSupplierOfferGroups(normalizeSupplierOfferGroups(groups));
            },
            onGroupUpdate: (alias, patch) => {
                setSupplierOfferGroups((previous) => {
                    const next = normalizeSupplierOfferGroups(previous.map((group) => (
                        group.alias === alias ? { ...group, ...patch } : group
                    )));
                    setOffers((current) => ({
                        ...current,
                        offer: mergeSupplierOffers(next),
                    }));
                    return next;
                });
            },
            onAllComplete: () => {
                if (offerRequestId === offerRequestIdRef.current) {
                    setOfferLoading(false);
                }
            },
        });
    }, [availableLoading, branchId, item, offerLoading, offersLoaded, orderNumber]);

    const handleToggleSupplierOffer = useCallback((alias) => {
        setSupplierOfferGroups((previous) => previous.map((group) => (
            group.alias === alias ? { ...group, expanded: !group.expanded } : group
        )));
    }, []);

    const toggleExpanded = () => {
        const nextExpanded = !expanded;
        setExpanded(nextExpanded);
        if (nextExpanded) {
            loadDetails();
        }
    };

    const details = {
        ...item,
        images: item.images || [],
        offers,
    };

    return (
        <div className={`an${expanded ? ' op' : ''}`}>
            <button type="button" className="an-h" aria-expanded={expanded} onClick={toggleExpanded}>
                <span className="an-id">
                    <span className="b">
                        {item.brand} <span>/</span> <span className="mono">{item.article}</span>
                    </span>
                    {item.name ? <span className="nm">{item.name}</span> : null}
                </span>
                <span className="an-av">
                    {stats.availableCount > 0 ? (
                        <span className="pill ok">
                            <span className="dot" />
                            {availableLoading ? '…' : `${stats.availableCount} в наличии`}
                        </span>
                    ) : null}
                    {stats.offerCount > 0 ? (
                        <span className="pill ord">
                            <span className="dot" />
                            {offerLoading ? '…' : `${stats.offerCount} под заказ`}
                        </span>
                    ) : null}
                    {!stats.availableCount && !stats.offerCount && !availableLoading && !offerLoading && expanded ? (
                        <span className="pill no">
                            <span className="dot" />
                            Нет предложений
                        </span>
                    ) : null}
                </span>
                <span className="an-eta">
                    {etaLabel}
                    <small>ближайшая выдача</small>
                </span>
                <span className="an-pr">
                    {minPrice ? money(minPrice) : '—'}
                </span>
                <span className="an-open">
                    Предложения
                    <svg className="ic" viewBox="0 0 24 24">
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </span>
            </button>
            {expanded ? (
                <div className="an-body">
                    <OffersMainSection
                        good={details}
                        offers={offers}
                        offersLoading={{
                            available: availableLoading,
                            offer: offerLoading,
                        }}
                        supplierOfferGroups={supplierOfferGroups}
                        onToggleSupplier={handleToggleSupplierOffer}
                        initialOrderNumber={orderNumber}
                    />
                </div>
            ) : null}
        </div>
    );
};

const SearchTabs = ({ activeTab, onChange, analogsCount, searchedCount }) => (
    <div className="tabs">
        <button
            type="button"
            className={`tab${activeTab === TAB_SEARCHED ? ' on' : ''}`}
            onClick={() => onChange(TAB_SEARCHED)}
        >
            Искомая запчасть
            {searchedCount > 0 ? <span className="n">{searchedCount}</span> : null}
        </button>
        <button
            type="button"
            className={`tab${activeTab === TAB_ANALOGS ? ' on' : ''}`}
            onClick={() => onChange(TAB_ANALOGS)}
        >
            Аналоги
            {analogsCount > 0 ? <span className="n">{analogsCount}</span> : null}
        </button>
    </div>
);

type SearchContainerProps = {
    branchId?: number
    branchName?: string
    townId?: number
}

export function SearchContainer({
    branchId: branchIdProp,
    branchName,
    townId: townIdProp,
}: SearchContainerProps = {}) {
    const [searchParams, setSearchParams] = useSearchParams();
    const articleParam = searchParams.get('article') || '';
    const brandParam = searchParams.get('brand') || '';
    const orderNumberParam = searchParams.get('orderNumber') || '';
    const resolvedBranchId = Number(branchIdProp) || 1;
    const [searchArticle, setSearchArticle] = useState(articleParam);
    const [searchBrand, setSearchBrand] = useState(brandParam);
    const [searchOrderNumber, setSearchOrderNumber] = useState(orderNumberParam);
    const [publicBranch, setPublicBranch] = useState({
        townName: branchName || '—',
        id: resolvedBranchId,
        address: '',
        townId: townIdProp != null ? Number(townIdProp) : null,
    });
    const [productVariants, setProductVariants] = useState([]);
    const [offers, setOffers] = useState(EMPTY_OFFERS);
    const [brands, setBrands] = useState([]);
    const [analogs, setAnalogs] = useState([]);
    const [analogsLoading, setAnalogsLoading] = useState(false);
    const [analogsLoadedKey, setAnalogsLoadedKey] = useState('');
    const [availableLoading, setAvailableLoading] = useState(false);
    const [offerLoading, setOfferLoading] = useState(false);
    const [supplierOfferGroups, setSupplierOfferGroups] = useState([]);
    const [brandsLoading, setBrandsLoading] = useState(false);
    const [cities, setCities] = useState([]);
    const [citiesLoading, setCitiesLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(TAB_SEARCHED);
    const branchId = publicBranch.id;
    const selectedVariant = productVariants.find((item) => item.brand === brandParam)
        || null;
    const currentGood = selectedVariant
        ? {
            ...selectedVariant,
            images: selectedVariant.images || [],
            offers,
        }
        : null;
    const availableRequestIdRef = useRef(0);
    const offerRequestIdRef = useRef(0);
    const brandsRequestIdRef = useRef(0);
    const citiesRequestIdRef = useRef(0);
    const brandsPendingCountRef = useRef(0);
    const brandVariantsBufferRef = useRef([]);
    const autoBrandAppliedRef = useRef('');
    const skipUrlBrandFetchRef = useRef(false);
    const getBrandVariantsRef = useRef(() => { });
    const isSearchLoading = brandsLoading && brands.length === 0;
    const offerStats = computeOfferStats(normalizeOffers(offers));
    const searchedCount = offerStats.total;
    const initialOrderNumber = orderNumberParam || searchOrderNumber;
    const activeBrand = searchArticle.trim() === articleParam.trim() ? brandParam : '';

    const updateSearchUrl = useCallback((article, brand, orderNumber = '', { replace = false } = {}) => {
        const params = new URLSearchParams();
        if (article) {
            params.set('article', article);
        }
        if (brand) {
            params.set('brand', brand);
        }
        if (orderNumber) {
            params.set('orderNumber', orderNumber);
        }
        setSearchParams(params, { replace });
    }, [setSearchParams]);

    const applyAutoBrandToUrl = useCallback((article, brand, orderNumber = '') => {
        if (!article || !brand || searchParams.get('brand')) {
            return;
        }

        const selectKey = `${article}|${orderNumber}`;
        if (autoBrandAppliedRef.current === selectKey) {
            return;
        }

        autoBrandAppliedRef.current = selectKey;
        setSearchBrand(brand);
        updateSearchUrl(article, brand, orderNumber, { replace: true });
    }, [searchParams, updateSearchUrl]);

    const applyBrandVariants = useCallback((incoming, searchValue, selectedBrand, orderNumberValue) => {
        brandVariantsBufferRef.current = mergeBrandVariants(brandVariantsBufferRef.current, incoming);
        const merged = brandVariantsBufferRef.current;
        const nextBrands = [...new Set(merged.map((item) => item.brand).filter(Boolean))];

        setProductVariants(merged);
        setBrands(nextBrands);
    }, []);

    const getBrandVariants = useCallback((searchValue, selectedBrand, orderNumberValue = '') => {
        if (!searchValue) {
            brandsRequestIdRef.current += 1;
            brandsPendingCountRef.current = 0;
            brandVariantsBufferRef.current = [];
            setProductVariants([]);
            setBrands([]);
            setOffers(EMPTY_OFFERS);
            setBrandsLoading(false);
            return;
        }

        const requestId = brandsRequestIdRef.current + 1;
        brandsRequestIdRef.current = requestId;
        brandVariantsBufferRef.current = [];
        brandsPendingCountRef.current = 2;
        setBrandsLoading(true);
        setProductVariants([]);
        setBrands([]);

        const baseParams = {
            article: searchValue,
            branchId,
        };

        const finishBrandsLoading = () => {
            if (requestId !== brandsRequestIdRef.current) {
                return;
            }
            if (brandVariantsBufferRef.current.length > 0) {
                setBrandsLoading(false);
                return;
            }
            if (brandsPendingCountRef.current <= 0) {
                setBrandsLoading(false);
            }
        };

        const finishBrandSource = () => {
            brandsPendingCountRef.current -= 1;
            if (requestId !== brandsRequestIdRef.current) {
                return;
            }
            finishBrandsLoading();
            if (brandsPendingCountRef.current <= 0 && !selectedBrand) {
                //setOffers(EMPTY_OFFERS);
            }
        };

        const handleBrandVariants = (variants, source) => {
            if (requestId !== brandsRequestIdRef.current) {
                return;
            }
            applyBrandVariants(variants, searchValue, selectedBrand, orderNumberValue);
            if (source === 'db' && variants.length > 0) {
                setBrandsLoading(false);
            }
            if (!selectedBrand) {
                const nextBrands = [...new Set(
                    brandVariantsBufferRef.current.map((item) => item.brand).filter(Boolean),
                )];
                if (nextBrands.length) {
                    applyAutoBrandToUrl(searchValue, nextBrands[0], orderNumberValue);
                }
            }
        };

        fetchBrandVariantsGroup({
            baseParams,
            source: 'db',
            requestId,
            requestIdRef: brandsRequestIdRef,
            onVariants: (variants) => handleBrandVariants(variants, 'db'),
            onError: () => { },
            onFinally: finishBrandSource,
        });
        fetchBrandVariantsGroup({
            baseParams,
            source: 'api',
            requestId,
            requestIdRef: brandsRequestIdRef,
            onVariants: (variants) => handleBrandVariants(variants, 'api'),
            onError: () => { },
            onFinally: finishBrandSource,
        });
    }, [applyAutoBrandToUrl, applyBrandVariants, branchId]);

    getBrandVariantsRef.current = getBrandVariants;

    const handleToggleSupplierOffer = useCallback((alias) => {
        setSupplierOfferGroups((previous) => previous.map((group) => (
            group.alias === alias ? { ...group, expanded: !group.expanded } : group
        )));
    }, []);

    const getOffers = useCallback((searchValue, brandValue, orderNumberValue = '') => {
        const loadKey = `${searchValue}|${brandValue}|${orderNumberValue}|${branchId}`;

        if (!searchValue || !brandValue) {
            availableRequestIdRef.current += 1;
            offerRequestIdRef.current += 1;
            setOffers(EMPTY_OFFERS);
            setSupplierOfferGroups([]);
            setAvailableLoading(false);
            setOfferLoading(false);
            return;
        }

        if (inFlightOffersLoadKeys.has(loadKey) || completedOffersLoadKeys.has(loadKey)) {
            return;
        }

        inFlightOffersLoadKeys.add(loadKey);

        const availableRequestId = availableRequestIdRef.current + 1;
        const offerRequestId = offerRequestIdRef.current + 1;
        availableRequestIdRef.current = availableRequestId;
        offerRequestIdRef.current = offerRequestId;

        let availableDone = false;
        let offerDone = false;
        const finishOffersLoad = () => {
            if (!availableDone || !offerDone) {
                return;
            }
            inFlightOffersLoadKeys.delete(loadKey);
            completedOffersLoadKeys.add(loadKey);
        };
        setOffers(EMPTY_OFFERS);
        setSupplierOfferGroups([]);
        setAvailableLoading(true);
        setOfferLoading(true);

        const baseParams = {
            article: searchValue,
            branchId,
            brand: brandValue,
            orderNumber: orderNumberValue,
        };

        fetchOffersGroup({
            baseParams,
            offersType: OFFERS_TAB_AVAILABLE,
            requestId: availableRequestId,
            requestIdRef: availableRequestIdRef,
            setOffers,
            setLoading: setAvailableLoading,
        }).finally(() => {
            if (availableRequestId === availableRequestIdRef.current) {
                availableDone = true;
                finishOffersLoad();
            }
        });

        loadSupplierOffersParallel({
            baseParams,
            branchId,
            requestId: offerRequestId,
            requestIdRef: offerRequestIdRef,
            onGroupsInit: (groups) => {
                setSupplierOfferGroups(normalizeSupplierOfferGroups(groups));
            },
            onGroupUpdate: (alias, patch) => {
                setSupplierOfferGroups((previous) => {
                    const next = normalizeSupplierOfferGroups(previous.map((group) => (
                        group.alias === alias ? { ...group, ...patch } : group
                    )));
                    setOffers((current) => ({
                        ...current,
                        offer: mergeSupplierOffers(next),
                    }));
                    return next;
                });
            },
            onAllComplete: () => {
                if (offerRequestId === offerRequestIdRef.current) {
                    setOfferLoading(false);
                    offerDone = true;
                    finishOffersLoad();
                }
            },
        });
    }, [branchId]);

    const getCities = useCallback((searchValue, brandValue) => {
        if (!searchValue || !brandValue) {
            citiesRequestIdRef.current += 1;
            setCities([]);
            setCitiesLoading(false);
            return;
        }

        const requestId = citiesRequestIdRef.current + 1;
        citiesRequestIdRef.current = requestId;
        setCitiesLoading(true);
        setCities([]);

        fetchCities({
            article: searchValue,
            brand: brandValue,
            branchId,
            requestId,
            requestIdRef: citiesRequestIdRef,
        }).then((citiesList) => {
            if (citiesList == null) {
                return;
            }
            setCities(citiesList);
        }).finally(() => {
            if (requestId === citiesRequestIdRef.current) {
                setCitiesLoading(false);
            }
        });
    }, [branchId]);

    const analogsRequestIdRef = useRef(0);

    const getAnalogs = useCallback((articleValue, brandValue) => {
        if (!articleValue || !brandValue) {
            analogsRequestIdRef.current += 1;
            setAnalogs([]);
            setAnalogsLoading(false);
            setAnalogsLoadedKey('');
            return;
        }

        const loadKey = `${articleValue}|${brandValue}`;
        if (loadKey === analogsLoadedKey) {
            return;
        }

        const requestId = analogsRequestIdRef.current + 1;
        analogsRequestIdRef.current = requestId;
        setAnalogsLoading(true);

        const params = buildGoodsParams({
            article: articleValue,
            brand: brandValue,
        });

        fetch(`${BACK_HOST}/product-analogs?${params}`, {
            method: 'GET',
            credentials: 'include',
        })
            .then((response) => response.json())
            .then((analogsList) => {
                if (requestId !== analogsRequestIdRef.current) {
                    return;
                }
                setAnalogs(Array.isArray(analogsList) ? analogsList : []);
                setAnalogsLoadedKey(loadKey);
            })
            .catch(() => {
                if (requestId !== analogsRequestIdRef.current) {
                    return;
                }
                setAnalogs([]);
                setAnalogsLoadedKey('');
            })
            .finally(() => {
                if (requestId === analogsRequestIdRef.current) {
                    setAnalogsLoading(false);
                }
            });
    }, [analogsLoadedKey]);

    const handleSearch = (value) => {
        const nextArticle = value.trim();
        if (!nextArticle) {
            return;
        }

        const orderNumberValue = searchOrderNumber.trim();

        availableRequestIdRef.current += 1;
        offerRequestIdRef.current += 1;
        brandsRequestIdRef.current += 1;
        citiesRequestIdRef.current += 1;

        setSearchArticle(nextArticle);
        setSearchBrand('');
        setActiveTab(TAB_SEARCHED);
        setProductVariants([]);
        setBrands([]);
        setOffers(EMPTY_OFFERS);
        setSupplierOfferGroups([]);
        setCities([]);
        setCitiesLoading(false);
        setAnalogs([]);
        setAnalogsLoadedKey('');
        setBrandsLoading(true);
        setAvailableLoading(false);
        setOfferLoading(false);
        autoBrandAppliedRef.current = '';
        resetOffersLoadTracking();
        skipUrlBrandFetchRef.current = true;
        updateSearchUrl(nextArticle, '', orderNumberValue);
        getBrandVariants(nextArticle, '', orderNumberValue);
        if (nextArticle === articleParam && orderNumberValue === orderNumberParam) {
            skipUrlBrandFetchRef.current = false;
        }
    };

    const handleBrandSelect = (brand) => {
        if (!articleParam || brand === brandParam) {
            return;
        }
        completedOffersLoadKeys.forEach((key) => {
            if (key.startsWith(`${articleParam}|${brandParam}|`)) {
                completedOffersLoadKeys.delete(key);
            }
        });
        setSearchBrand(brand);
        setOffers(EMPTY_OFFERS);
        updateSearchUrl(articleParam, brand, orderNumberParam || searchOrderNumber.trim());
    };

    const handleOrderNumberChange = (value) => {
        setSearchOrderNumber(value);
    };

    useEffect(() => {
        setSearchArticle(articleParam);
        setSearchBrand(brandParam);
        setSearchOrderNumber(orderNumberParam);
    }, [articleParam, brandParam, orderNumberParam]);

    useEffect(() => {
        setPublicBranch((previous) => ({
            ...previous,
            id: resolvedBranchId,
            townName: branchName || previous.townName,
            townId: townIdProp != null ? Number(townIdProp) : previous.townId,
        }));
    }, [resolvedBranchId, branchName, townIdProp]);

    useEffect(() => {
        resetOffersLoadTracking();
        autoBrandAppliedRef.current = '';
    }, [articleParam]);

    useEffect(() => {
        if (!articleParam) {
            return;
        }
        if (skipUrlBrandFetchRef.current) {
            skipUrlBrandFetchRef.current = false;
            return;
        }
        getBrandVariantsRef.current(articleParam, brandParam, orderNumberParam);
    }, [articleParam, orderNumberParam]);

    useEffect(() => {
        if (!articleParam || brandParam || brandsLoading || !brands.length) {
            return;
        }
        applyAutoBrandToUrl(articleParam, brands[0], orderNumberParam);
    }, [
        articleParam,
        brandParam,
        brands,
        brandsLoading,
        orderNumberParam,
        applyAutoBrandToUrl,
    ]);

    useEffect(() => {
        getOffers(articleParam, brandParam, orderNumberParam);
    }, [articleParam, brandParam, orderNumberParam, getOffers]);

    useEffect(() => {
        getCities(articleParam, brandParam);
    }, [articleParam, brandParam, getCities]);

    useEffect(() => {
        getAnalogs(articleParam, brandParam);
    }, [activeTab, articleParam, brandParam, getAnalogs]);

    return (
        <div id="search-app">
            <div className="searchzone">
                <div className="sz-in">
                    <div className="city">Наличие и стоимость для города<button>
                        <svg className="ic" viewBox="0 0 24 24">
                            <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z">
                            </path>
                            <circle cx="12" cy="10" r="2.6">
                            </circle>
                        </svg>{resolvedBranchId === 2 ? 'Магадан' : (branchName || publicBranch.townName)}<svg className="ic" viewBox="0 0 24 24">
                            <path d="M6 9l6 6 6-6">
                            </path>
                        </svg>
                    </button>
                        <span className="sp">
                        </span>
                        {/*<span>Часовой пояс клиента: UTC+10 · 14:07</span>*/}
                    </div>
                    <div className="qrow">
                        <div className="qbox">
                            <svg className="ic ic-l" viewBox="0 0 24 24">
                                <circle cx="11" cy="11" r="7">
                                </circle>
                                <path d="M21 21l-4.3-4.3">
                                </path>
                            </svg>
                            <input
                                placeholder="Артикул"
                                value={searchArticle}
                                onChange={(event) => {
                                    const nextArticle = event.target.value;
                                    setSearchArticle(nextArticle);
                                    if (nextArticle.trim() !== articleParam.trim()) {
                                        setSearchBrand('');
                                    }
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        handleSearch(event.target.value);
                                    }
                                }}
                            />
                            <button
                                className="clr"
                                title="Очистить"
                                onClick={() => {
                                    setSearchArticle('');
                                    setSearchBrand('');
                                    updateSearchUrl('', '', searchOrderNumber.trim());
                                }}
                            >
                                <svg className="ic" viewBox="0 0 24 24">
                                    <path d="M18 6L6 18M6 6l12 12">
                                    </path>
                                </svg>
                            </button>
                        </div>
                        <div className="scope">
                            <button className="on">Артикул</button>
                            <button>Название</button>
                            <button>По каталогу</button>
                            <button>Масла</button>
                        </div>
                        <button
                            className="qgo"
                            disabled={!searchArticle}
                            onClick={() => handleSearch(searchArticle)}
                        >
                            <svg className="ic" viewBox="0 0 24 24">
                                <circle cx="11" cy="11" r="7">
                                </circle>
                                <path d="M21 21l-4.3-4.3">
                                </path>
                            </svg>Искать
                        </button>
                    </div>
                    <BrandSelector
                        key={articleParam}
                        brands={brands}
                        selectedBrand={activeBrand}
                        onSelect={handleBrandSelect}
                    />
                    <SearchTabs
                        activeTab={activeTab}
                        onChange={setActiveTab}
                        analogsCount={analogs.length}
                        searchedCount={searchedCount}
                    />
                </div>
            </div>

            <div className="wrap">
                <div className="cols">
                    {currentGood ? (
                        <ProductSidebar
                            good={currentGood}
                            offers={offers}
                            analogsCount={analogs.length}
                            loading={availableLoading || offerLoading}
                        />
                    ) : null}

                    <main className="main">
                        <section hidden={activeTab !== TAB_SEARCHED}>
                            {!articleParam ? (
                                <div className="card empty-msg">Введите артикул для поиска</div>
                            ) : isSearchLoading ? (
                                <div className="card loading-card" aria-live="polite" aria-busy="true">
                                    <span className="loading-card__spinner" aria-label="Загрузка" />
                                    <span>Идёт поиск товара...</span>
                                </div>
                            ) : currentGood ? (
                                <OffersMainSection
                                    good={currentGood}
                                    offers={offers}
                                    offersLoading={{
                                        available: availableLoading,
                                        offer: offerLoading,
                                    }}
                                    supplierOfferGroups={supplierOfferGroups}
                                    onToggleSupplier={handleToggleSupplierOffer}
                                    initialOrderNumber={initialOrderNumber}
                                    cities={cities}
                                    citiesLoading={citiesLoading}
                                    currentTownId={publicBranch.townId}
                                />
                            ) : (
                                <div className="card empty-msg">
                                    {brands.length
                                        ? 'Нет товаров для выбранного бренда'
                                        : 'Информации о товаре нет'}
                                </div>
                            )}
                        </section>

                        <section hidden={activeTab !== TAB_ANALOGS}>
                            <div className="card">
                                {currentGood ? (
                                    <div className="orig">
                                        <span className="tag">Искомая запчасть</span>
                                        <span style={{ fontWeight: 700 }}>
                                            {currentGood.brand} / <span className="mono">{currentGood.article}</span>
                                        </span>
                                        <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                                            {currentGood.name || '—'}
                                            {offerStats.minPrice ? ` · от ${money(offerStats.minPrice)}` : ''}
                                            {offerStats.nearestEta ? ` · ${offerStats.nearestEta}` : ''}
                                        </span>
                                        <span className="sp" />
                                        <button type="button" className="an-open" onClick={() => setActiveTab(TAB_SEARCHED)}>
                                            К предложениям
                                            <svg className="ic" viewBox="0 0 24 24">
                                                <path d="M5 12h14M13 6l6 6-6 6" />
                                            </svg>
                                        </button>
                                    </div>
                                ) : null}
                                <div id="anlist">
                                    {analogsLoading ? (
                                        <div className="loading-card">
                                            <span className="loading-card__spinner" aria-label="Загрузка" />
                                            <span>Загрузка аналогов...</span>
                                        </div>
                                    ) : analogs.length ? (
                                        analogs.map((item) => (
                                            <AnalogItemApp
                                                key={`${item.brand}-${item.article}`}
                                                item={item}
                                                branchId={branchId}
                                                orderNumber={initialOrderNumber}
                                            />
                                        ))
                                    ) : (
                                        <div className="empty-msg">
                                            {articleParam && brandParam
                                                ? 'Аналоги не найдены'
                                                : 'Введите артикул и выберите бренд'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </main>
                </div>
            </div>

            <div className="toast" id="toast">
                <span className="k">
                    <svg className="ic" viewBox="0 0 24 24" style={{ stroke: '#fff', width: 13, height: 13 }}>
                        <path d="M20 6L9 17l-5-5">
                        </path>
                    </svg>
                </span>
                <span id="toastText">Готово</span>
            </div>
        </div>)
}

export default SearchContainer;
