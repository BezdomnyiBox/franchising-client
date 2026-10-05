// @ts-nocheck
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnalogsPanel } from "./components/AnalogsPanel";
import { ProductSidebar } from "./components/ProductSidebar";
import { SearchHeader } from "./components/SearchHeader";
import { SearchedProductPanel } from "./components/SearchedProductPanel";
import {
    EMPTY_OFFERS,
    OFFERS_TAB_AVAILABLE,
    TAB_ANALOGS,
    TAB_SEARCHED,
} from "./lib/constants";
import {
    computeOfferStats,
    mergeBrandVariants,
    mergeSupplierOffers,
    normalizeOffers,
    normalizeSupplierOfferGroups,
} from "./lib/offers";
import {
    fetchAnalogs,
    fetchBrandVariantsGroup,
    fetchCities,
    fetchOffersGroup,
    getCompletedOffersLoadKeys,
    getInFlightOffersLoadKeys,
    loadSupplierOffersParallel,
    resetOffersLoadTracking,
} from "./lib/supplierGoodsApi";
type SearchContainerProps = {
    branchId?: number;
    branchName?: string;
    townId?: number;
    /** false — диалог позиции: state локальный, URL браузера не трогаем */
    syncUrl?: boolean;
    initialArticle?: string;
    initialBrand?: string;
    initialOrderNumber?: string;
    offerAction?:
    | {
        mode: "add-to-order";
    }
    | {
        mode: "set-to-element";
        target: {
            orderElementId: number;
            onPicked?: () => void;
            onError?: (message: string) => void;
        };
    };
};

export function SearchContainer({
    branchId: branchIdProp,
    branchName,
    townId: townIdProp,
    syncUrl = true,
    initialArticle = "",
    initialBrand = "",
    initialOrderNumber: seedOrderNumber = "",
    offerAction = { mode: "add-to-order" },
}: SearchContainerProps = {}) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [localQuery, setLocalQuery] = useState({
        article: initialArticle,
        brand: initialBrand,
        orderNumber: seedOrderNumber,
    });

    const articleParam = syncUrl
        ? searchParams.get("article") || ""
        : localQuery.article;
    const brandParam = syncUrl
        ? searchParams.get("brand") || ""
        : localQuery.brand;
    const orderNumberParam = syncUrl
        ? searchParams.get("orderNumber") || ""
        : localQuery.orderNumber;
    const resolvedBranchId = Number(branchIdProp) || 1;

    const [searchArticle, setSearchArticle] = useState(articleParam);
    const [searchBrand, setSearchBrand] = useState(brandParam);
    const [searchOrderNumber, setSearchOrderNumber] = useState(orderNumberParam);
    const [publicBranch, setPublicBranch] = useState({
        townName: branchName || "—",
        id: resolvedBranchId,
        address: "",
        townId: townIdProp != null ? Number(townIdProp) : null,
    });
    const [productVariants, setProductVariants] = useState([]);
    const [offers, setOffers] = useState(EMPTY_OFFERS);
    const [brands, setBrands] = useState([]);
    const [analogs, setAnalogs] = useState([]);
    const [analogsLoading, setAnalogsLoading] = useState(false);
    const [analogsLoadedKey, setAnalogsLoadedKey] = useState("");
    const [availableLoading, setAvailableLoading] = useState(false);
    const [offerLoading, setOfferLoading] = useState(false);
    const [supplierOfferGroups, setSupplierOfferGroups] = useState([]);
    const [brandsLoading, setBrandsLoading] = useState(false);
    const [cities, setCities] = useState([]);
    const [citiesLoading, setCitiesLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(TAB_SEARCHED);

    const branchId = publicBranch.id;
    const selectedVariant =
        productVariants.find((item) => item.brand === brandParam) || null;
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
    const autoBrandAppliedRef = useRef("");
    const skipUrlBrandFetchRef = useRef(false);
    const getBrandVariantsRef = useRef(() => { });
    const analogsRequestIdRef = useRef(0);

    const isSearchLoading = brandsLoading && brands.length === 0;
    const offerStats = computeOfferStats(normalizeOffers(offers));
    const searchedCount = offerStats.total;
    const initialOrderNumber = orderNumberParam || searchOrderNumber;
    const activeBrand =
        searchArticle.trim() === articleParam.trim() ? brandParam : "";
    const cityLabel =
        resolvedBranchId === 2 ? "Магадан" : branchName || publicBranch.townName;

    const updateSearchUrl = useCallback(
        (article, brand, orderNumber = "", { replace = false } = {}) => {
            if (!syncUrl) {
                setLocalQuery({ article, brand, orderNumber });
                return;
            }
            const params = new URLSearchParams();
            if (article) params.set("article", article);
            if (brand) params.set("brand", brand);
            if (orderNumber) params.set("orderNumber", orderNumber);
            setSearchParams(params, { replace });
        },
        [setSearchParams, syncUrl],
    );

    const applyAutoBrandToUrl = useCallback(
        (article, brand, orderNumber = "") => {
            const hasBrand = syncUrl
                ? Boolean(searchParams.get("brand"))
                : Boolean(localQuery.brand);
            if (!article || !brand || hasBrand) return;

            const selectKey = `${article}|${orderNumber}`;
            if (autoBrandAppliedRef.current === selectKey) return;

            autoBrandAppliedRef.current = selectKey;
            setSearchBrand(brand);
            updateSearchUrl(article, brand, orderNumber, { replace: true });
        },
        [localQuery.brand, searchParams, syncUrl, updateSearchUrl],
    );

    const applyBrandVariants = useCallback((incoming) => {
        brandVariantsBufferRef.current = mergeBrandVariants(
            brandVariantsBufferRef.current,
            incoming,
        );
        const merged = brandVariantsBufferRef.current;
        const nextBrands = [
            ...new Set(merged.map((item) => item.brand).filter(Boolean)),
        ];
        setProductVariants(merged);
        setBrands(nextBrands);
    }, []);

    const getBrandVariants = useCallback(
        (searchValue, selectedBrand, orderNumberValue = "") => {
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

            const baseParams = { article: searchValue, branchId };

            const finishBrandsLoading = () => {
                if (requestId !== brandsRequestIdRef.current) return;
                if (brandVariantsBufferRef.current.length > 0) {
                    setBrandsLoading(false);
                    return;
                }
                if (brandsPendingCountRef.current <= 0) setBrandsLoading(false);
            };

            const finishBrandSource = () => {
                brandsPendingCountRef.current -= 1;
                if (requestId !== brandsRequestIdRef.current) return;
                finishBrandsLoading();
            };

            const handleBrandVariants = (variants, source) => {
                if (requestId !== brandsRequestIdRef.current) return;
                applyBrandVariants(variants);
                if (source === "db" && variants.length > 0) setBrandsLoading(false);
                if (!selectedBrand) {
                    const nextBrands = [
                        ...new Set(
                            brandVariantsBufferRef.current
                                .map((item) => item.brand)
                                .filter(Boolean),
                        ),
                    ];
                    if (nextBrands.length) {
                        applyAutoBrandToUrl(searchValue, nextBrands[0], orderNumberValue);
                    }
                }
            };

            fetchBrandVariantsGroup({
                baseParams,
                source: "db",
                requestId,
                requestIdRef: brandsRequestIdRef,
                onVariants: (variants) => handleBrandVariants(variants, "db"),
                onError: () => { },
                onFinally: finishBrandSource,
            });
            fetchBrandVariantsGroup({
                baseParams,
                source: "api",
                requestId,
                requestIdRef: brandsRequestIdRef,
                onVariants: (variants) => handleBrandVariants(variants, "api"),
                onError: () => { },
                onFinally: finishBrandSource,
            });
        },
        [applyAutoBrandToUrl, applyBrandVariants, branchId],
    );

    getBrandVariantsRef.current = getBrandVariants;

    const handleToggleSupplierOffer = useCallback((alias) => {
        setSupplierOfferGroups((previous) =>
            previous.map((group) =>
                group.alias === alias ? { ...group, expanded: !group.expanded } : group,
            ),
        );
    }, []);

    const getOffers = useCallback(
        (searchValue, brandValue, orderNumberValue = "") => {
            const loadKey = `${searchValue}|${brandValue}|${orderNumberValue}|${branchId}`;
            const inFlight = getInFlightOffersLoadKeys();
            const completed = getCompletedOffersLoadKeys();

            if (!searchValue || !brandValue) {
                availableRequestIdRef.current += 1;
                offerRequestIdRef.current += 1;
                setOffers(EMPTY_OFFERS);
                setSupplierOfferGroups([]);
                setAvailableLoading(false);
                setOfferLoading(false);
                return;
            }

            if (inFlight.has(loadKey) || completed.has(loadKey)) return;

            inFlight.add(loadKey);

            const availableRequestId = availableRequestIdRef.current + 1;
            const offerRequestId = offerRequestIdRef.current + 1;
            availableRequestIdRef.current = availableRequestId;
            offerRequestIdRef.current = offerRequestId;

            let availableDone = false;
            let offerDone = false;
            const finishOffersLoad = () => {
                if (!availableDone || !offerDone) return;
                inFlight.delete(loadKey);
                completed.add(loadKey);
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
                        const next = normalizeSupplierOfferGroups(
                            previous.map((group) =>
                                group.alias === alias ? { ...group, ...patch } : group,
                            ),
                        );
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
        },
        [branchId],
    );

    const getCities = useCallback(
        (searchValue, brandValue) => {
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
            })
                .then((citiesList) => {
                    if (citiesList == null) return;
                    setCities(citiesList);
                })
                .finally(() => {
                    if (requestId === citiesRequestIdRef.current) setCitiesLoading(false);
                });
        },
        [branchId],
    );

    const getAnalogs = useCallback(
        (articleValue, brandValue) => {
            if (!articleValue || !brandValue) {
                analogsRequestIdRef.current += 1;
                setAnalogs([]);
                setAnalogsLoading(false);
                setAnalogsLoadedKey("");
                return;
            }

            const loadKey = `${articleValue}|${brandValue}`;
            if (loadKey === analogsLoadedKey) return;

            const requestId = analogsRequestIdRef.current + 1;
            analogsRequestIdRef.current = requestId;
            setAnalogsLoading(true);

            fetchAnalogs({
                article: articleValue,
                brand: brandValue,
                requestId,
                requestIdRef: analogsRequestIdRef,
            })
                .then((analogsList) => {
                    if (analogsList == null) return;
                    setAnalogs(analogsList);
                    setAnalogsLoadedKey(loadKey);
                })
                .catch(() => {
                    if (requestId !== analogsRequestIdRef.current) return;
                    setAnalogs([]);
                    setAnalogsLoadedKey("");
                })
                .finally(() => {
                    if (requestId === analogsRequestIdRef.current)
                        setAnalogsLoading(false);
                });
        },
        [analogsLoadedKey],
    );

    const handleSearch = (value) => {
        const nextArticle = value.trim();
        if (!nextArticle) return;

        const orderNumberValue = searchOrderNumber.trim();

        availableRequestIdRef.current += 1;
        offerRequestIdRef.current += 1;
        brandsRequestIdRef.current += 1;
        citiesRequestIdRef.current += 1;

        setSearchArticle(nextArticle);
        setSearchBrand("");
        setActiveTab(TAB_SEARCHED);
        setProductVariants([]);
        setBrands([]);
        setOffers(EMPTY_OFFERS);
        setSupplierOfferGroups([]);
        setCities([]);
        setCitiesLoading(false);
        setAnalogs([]);
        setAnalogsLoadedKey("");
        setBrandsLoading(true);
        setAvailableLoading(false);
        setOfferLoading(false);
        autoBrandAppliedRef.current = "";
        resetOffersLoadTracking();
        skipUrlBrandFetchRef.current = true;
        updateSearchUrl(nextArticle, "", orderNumberValue);
        getBrandVariants(nextArticle, "", orderNumberValue);
        if (nextArticle === articleParam && orderNumberValue === orderNumberParam) {
            skipUrlBrandFetchRef.current = false;
        }
    };

    const handleBrandSelect = (brand) => {
        if (!articleParam || brand === brandParam) return;
        const completed = getCompletedOffersLoadKeys();
        completed.forEach((key) => {
            if (key.startsWith(`${articleParam}|${brandParam}|`))
                completed.delete(key);
        });
        setSearchBrand(brand);
        setOffers(EMPTY_OFFERS);
        updateSearchUrl(
            articleParam,
            brand,
            orderNumberParam || searchOrderNumber.trim(),
        );
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
        autoBrandAppliedRef.current = "";
    }, [articleParam]);

    useEffect(() => {
        if (!articleParam) return;
        if (skipUrlBrandFetchRef.current) {
            skipUrlBrandFetchRef.current = false;
            return;
        }
        getBrandVariantsRef.current(articleParam, brandParam, orderNumberParam);
    }, [articleParam, orderNumberParam]);

    useEffect(() => {
        if (!articleParam || brandParam || brandsLoading || !brands.length) return;
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
        <div className="space-y-6">
            <SearchHeader
                cityLabel={cityLabel}
                searchArticle={searchArticle}
                onArticleChange={(nextArticle) => {
                    setSearchArticle(nextArticle);
                    if (nextArticle.trim() !== articleParam.trim()) setSearchBrand("");
                }}
                onSearch={handleSearch}
                onClear={() => {
                    setSearchArticle("");
                    setSearchBrand("");
                    updateSearchUrl("", "", searchOrderNumber.trim());
                }}
                brands={brands}
                articleParam={articleParam}
                activeBrand={activeBrand}
                onBrandSelect={handleBrandSelect}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                analogsCount={analogs.length}
                searchedCount={searchedCount}
            />

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                {currentGood ? (
                    <ProductSidebar
                        good={currentGood}
                        offers={offers}
                        analogsCount={analogs.length}
                        loading={availableLoading || offerLoading}
                    />
                ) : null}

                <main className="min-w-0 flex-1 space-y-4">
                    <section hidden={activeTab !== TAB_SEARCHED}>
                        <SearchedProductPanel
                            articleParam={articleParam}
                            isSearchLoading={isSearchLoading}
                            currentGood={currentGood}
                            brands={brands}
                            offers={offers}
                            availableLoading={availableLoading}
                            offerLoading={offerLoading}
                            supplierOfferGroups={supplierOfferGroups}
                            onToggleSupplier={handleToggleSupplierOffer}
                            initialOrderNumber={initialOrderNumber}
                            cities={cities}
                            citiesLoading={citiesLoading}
                            currentTownId={publicBranch.townId}
                            offerAction={offerAction}
                        />
                    </section>

                    <section hidden={activeTab !== TAB_ANALOGS}>
                        <AnalogsPanel
                            currentGood={currentGood}
                            offerStats={offerStats}
                            onBackToOffers={setActiveTab}
                            analogsLoading={analogsLoading}
                            analogs={analogs}
                            branchId={branchId}
                            initialOrderNumber={initialOrderNumber}
                            articleParam={articleParam}
                            brandParam={brandParam}
                            offerAction={offerAction}
                        />
                    </section>
                </main>
            </div>
        </div>
    );
}

export default SearchContainer;
