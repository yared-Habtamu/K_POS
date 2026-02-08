import 'dart:async';
import 'dart:math';

import 'package:bloc/bloc.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:meta/meta.dart';
import 'package:pos_app/features/manager/domain/payment_model.dart';

import '../../../../services/api/api_client.dart';
import '../../../products/domain/product_model.dart';
import '../../domain/product_model.dart';

part 'manager_event.dart';
part 'manager_state.dart';

class ManagerBloc extends Bloc<ManagerEvent, ManagerState> {
  final ApiClient apiClient;
  ManagerBloc({required this.apiClient}) : super(ManagerState()) {
    on<ManagerAssetRegistrations>(_managerAssetRegistrations);
    on<ManagerAssetFetchingEvent>(_managerAssetFetchingEvent);
    on<ManagerFetchAlertEvent>(_managerFetchAlertEvent);
    on<ManagerFetchSoonExpiredProduct>(_managerFetchSoonExpiredProduct);
    on<ManagerFetchProducts>(_managerFetchProducts);
    on<ManagerReportProductStatEvent>(_managerReportProductStatEvent);
  }

  FutureOr<void> _managerAssetRegistrations(
    ManagerAssetRegistrations event,
    Emitter<ManagerState> emit,
  ) async {
    if (event.name.trim().isEmpty || event.quantity <= 0) {
      emit(
        state.copyWith(
          error: "Please provide a valid asset name and quantity.",
        ),
      );
      return;
    }

    emit(state.copyWith(loading: true, error: null));

    try {
      final response = await apiClient.postJson(
        '/assets', // don't append baseUrl here, ApiClient does it
        body: {
          "name": event.name.trim(),
          "quantity": event.quantity,
          "martId": event.martId,
        },
      );

      final saved = response['data'] ?? response;
      if (saved == null || saved['name'] == null) {
        throw ApiException(message: "Invalid response from server");
      }

      final newAsset = {
        "id": saved['_id'] ?? saved['id'],
        "name": saved['name'],
        "quantity": saved['quantity'],
      };

      emit(
        state.copyWith(
          loading: false,
          registeredAssets: [newAsset, ...state.registeredAssets],
          error: null,
        ),
      );
    } on ApiException catch (e) {
      emit(
        state.copyWith(
          loading: false,
          error: e.message.isNotEmpty ? e.message : "Failed to register asset",
        ),
      );
    } catch (e, stackTrace) {
      debugPrint("Unexpected error in asset registration: $e\n$stackTrace");

      emit(
        state.copyWith(
          loading: false,
          error: "Something went wrong. Please try again later.",
        ),
      );
    }
  }

  FutureOr<void> _managerAssetFetchingEvent(
    ManagerAssetFetchingEvent event,
    Emitter<ManagerState> emit,
  ) async {
    emit(state.copyWith(
      loading: true,
      error: null,
    ));

    try {
      String path = '/assets';

      if (event.martID.isNotEmpty) {
        path += '?martId=${event.martID}';
      }
      final response = await apiClient.getJson(path) as List;

      final assets = response.map((e) {
        return {
          "id": e['_id'] ?? e['id'],
          "name": e['name'] ?? 'Unnamed',
          "quantity": e['quantity'] ?? 0,
        };
      }).toList();

      emit(state.copyWith(
        loading: false,
        registeredAssets: assets,
      ));
    } on ApiException catch (e) {
      emit(state.copyWith(
        loading: false,
        error: e.message,
      ));
    } catch (e, st) {
      debugPrint("Asset fetch crash: $e\n$st");

      emit(state.copyWith(
        loading: false,
        error: "Failed to load assets. Please try again.",
      ));
    }
  }

  FutureOr<void> _managerFetchProducts(
    ManagerFetchProducts event,
    Emitter<ManagerState> emit,
  ) async {
    emit(state.copyWith(loading: true, error: null));

    try {
      final response = await apiClient.getJson('/products');

      final List list;
      if (response['data'] is List) {
        list = response['data'];
      } else {
        throw Exception("Invalid server response");
      }

      final products = list
          .map((e) => MProduct.fromJson(e as Map<String, dynamic>))
          .toList();

      final alertProducts = products.where((p) => p.isLowStock).toList();

      final expiringSoonProducts =
          products.where((p) => p.isExpiringSoon()).toList();

      emit(
        state.copyWith(
          products: products,
          alertProducts: alertProducts,
          expiringSoonProducts: expiringSoonProducts,
          loading: false,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          loading: false,
          error: e.toString(),
        ),
      );
    }
  }

  FutureOr<void> _managerFetchAlertEvent(
    ManagerFetchAlertEvent event,
    Emitter<ManagerState> emit,
  ) async {
    final alerts = state.products.where((p) => p.isLowStock).toList();
    emit(state.copyWith(alertProducts: alerts));
  }

  FutureOr<void> _managerFetchSoonExpiredProduct(
    ManagerFetchSoonExpiredProduct event,
    Emitter<ManagerState> emit,
  ) async {
    final soonExpiring =
        state.products.where((p) => p.isExpiringSoon()).toList();
    emit(state.copyWith(expiringSoonProducts: soonExpiring));
  }

  FutureOr<void> _managerReportProductStatEvent(
    ManagerReportProductStatEvent event,
    Emitter<ManagerState> emit,
  ) async {
    emit(state.copyWith(
      loading: true,
      error: null,
    ));

    try {
      String path = '/reports/mart?range=${event.range ?? "monthly"}';

      if (event.martID != null && event.martID!.isNotEmpty) {
        path += '&martId=${event.martID}';
      }

      final response = await apiClient.getJson(path);

      debugPrint("✅ [5] API RESPONSE RECEIVED");
      debugPrint("RESPONSE TYPE -> ${response.runtimeType}");
      debugPrint("RESPONSE BODY -> $response");
      debugPrint("✅ [8] Parsing totals...");

      final double totalSales = (response['totalSales'] ?? 0).toDouble();

      final int totalOrders = (response['transactions'] ?? 0);

      final double avgOrder = totalOrders == 0 ? 0 : totalSales / totalOrders;

      debugPrint("TOTAL SALES -> $totalSales");
      debugPrint("TOTAL ORDERS -> $totalOrders");
      debugPrint("AVG ORDER -> $avgOrder");

      final paymentList = [
        {
          "method": 'cash',
          'total': 10,
        },
        {
          "method": 'telebir',
          'total': 20,
        },
        {
          "method": 'CBE',
          'total': 30,
        }
      ];

      debugPrint("PAYMENT RAW -> $paymentList");

      final random = Random();

      final paymentMethods = paymentList.map<PaymentMethod>((e) {
            return PaymentMethod(
              name: e['method'] as String? ?? "Unknown",
              amount: (e['total'] as num? ?? 0).toDouble(),
              color: HSVColor.fromAHSV(
                1,
                random.nextDouble() * 360, // different hue
                0.65,
                0.85,
              ).toColor(),
            );
          }).toList() ??
          [];

      final productList = response['topProducts'] as List?;

      debugPrint("PRODUCT RAW -> $productList");

      final topProducts = productList?.map<TopProduct>((e) {
            debugPrint("➡️ Product item -> $e");

            return TopProduct(
              name: e['name'] ?? 'Unknown',
              revenue: (e['revenue'] ?? 0).toDouble(),
              productId: e['productId'],
              sold: e['sold'],
            );
          }).toList() ??
          [];

      debugPrint("✅ Top products parsed -> ${topProducts.length}");

      debugPrint("🔥 [11] EMITTING SUCCESS STATE");

      emit(state.copyWith(
        loading: false,
        totalSales: totalSales,
        totalOrders: totalOrders,
        avgOrder: avgOrder,
        paymentMethods: paymentMethods,
        topProducts: topProducts,
      ));

      debugPrint("✅ [12] STATE EMITTED SUCCESSFULLY");
    } on ApiException catch (e) {
      debugPrint("❌ API ERROR -> ${e.message}");

      emit(state.copyWith(
        loading: false,
        error: e.message,
      ));
    } catch (e, st) {
      debugPrint("💥 REPORT CRASH -> $e");
      debugPrintStack(stackTrace: st);

      emit(state.copyWith(
        loading: false,
        error: "Failed to load report. Please try again.",
      ));
    }
  }
}
